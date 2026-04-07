package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	chicors "github.com/go-chi/cors"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/redis/go-redis/v9"

	"typr/backend/internal/auth"
	"typr/backend/internal/cache"
	"typr/backend/internal/config"
	"typr/backend/internal/db"
	"typr/backend/internal/game"
	"typr/backend/internal/learning"
	"typr/backend/internal/protocol"
	"typr/backend/internal/room"
	"typr/backend/internal/users"
	iws "typr/backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type server struct {
	hub      *iws.Hub
	manager  *room.Manager
	pg       *pgxpool.Pool
	users    users.Repository
	verifier auth.Verifier
	learning learning.Repository
}

func newServer(rdb *redis.Client, pg *pgxpool.Pool, userRepo users.Repository, authVerifier auth.Verifier, learningRepo learning.Repository) *server {
	return &server{
		hub:      iws.NewHub(),
		manager:  room.NewManager(rdb),
		pg:       pg,
		users:    userRepo,
		verifier: authVerifier,
		learning: learningRepo,
	}
}

type socketIdentity struct {
	UserID string
}

func (s *server) handleWS(w http.ResponseWriter, r *http.Request) {
	identity, err := s.socketIdentityFromRequest(r)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	uid := room.GenerateID()
	var currentRoomID string

	client := iws.NewClient(
		uid, conn, s.hub,
		func(currentUID string, msg *protocol.InboundMessage) {
			s.handleMessage(currentUID, &currentRoomID, identity, msg)
		},
		func(currentUID string) {
			if currentRoomID != "" {
				if rm, ok := s.manager.GetByID(currentRoomID); ok {
					select {
					case rm.DisconnectChan <- currentUID:
					default:
					}
				}
			}
		},
	)

	s.hub.Register(uid, client)
	s.send(uid, protocol.ConnectedMsg{Type: protocol.TypeConnected, UID: uid})
	client.Run()
}

func (s *server) socketIdentityFromRequest(r *http.Request) (socketIdentity, error) {
	token := strings.TrimSpace(r.URL.Query().Get("token"))
	if token == "" {
		return socketIdentity{}, nil
	}

	claims, err := s.verifier.VerifyIDToken(r.Context(), token)
	if err != nil {
		return socketIdentity{}, err
	}

	user, err := s.users.FindOrCreateByFirebase(r.Context(), claims.FirebaseUID, claims.Email, claims.DisplayName)
	if err != nil {
		return socketIdentity{}, err
	}

	return socketIdentity{UserID: user.ID}, nil
}

func (s *server) handleMessage(uid string, currentRoomID *string, identity socketIdentity, msg *protocol.InboundMessage) {
	switch msg.Type {

	case protocol.TypeCreateRoom:
		if msg.PlayerName == "" {
			s.sendError(uid, "invalid_input", "playerName is required")
			return
		}
		rm := s.manager.Create(uid, msg.PlayerName, identity.UserID)
		*currentRoomID = rm.ID
		log.Printf("[room] created %s (code %s) by %s", rm.ID, rm.Code, uid)
		s.send(uid, protocol.RoomCreatedMsg{
			Type:   protocol.TypeRoomCreated,
			RoomID: rm.ID,
			Code:   rm.Code,
		})

	case protocol.TypeJoinRoom:
		if msg.Code == "" || msg.PlayerName == "" {
			s.sendError(uid, "invalid_input", "code and playerName are required")
			return
		}
		rm, ok := s.manager.GetByCode(msg.Code)
		if !ok {
			s.sendError(uid, "room_not_found", "No room with that code")
			return
		}
		if rm.Status != room.StatusLobby {
			s.sendError(uid, "game_in_progress", "That game has already started")
			return
		}
		if !rm.AddPlayer(uid, msg.PlayerName, identity.UserID) {
			s.sendError(uid, "room_full", "Room already has 2 players")
			return
		}
		*currentRoomID = rm.ID
		s.manager.PersistPlayerJoin(rm.ID, room.Player{
			UID:    uid,
			Name:   msg.PlayerName,
			UserID: identity.UserID,
		})
		log.Printf("[room] %s joined %s (code %s)", uid, rm.ID, rm.Code)
		s.broadcastPlayerList(rm)

	case protocol.TypeSetReady:
		if *currentRoomID == "" {
			s.sendError(uid, "not_in_room", "You are not in a room")
			return
		}
		rm, ok := s.manager.GetByID(*currentRoomID)
		if !ok {
			s.sendError(uid, "room_not_found", "Room no longer exists")
			return
		}
		rm.SetReady(uid)
		s.broadcastPlayerList(rm)

		if rm.AllReady() {
			log.Printf("[room] %s all ready — starting game", rm.ID)
			s.broadcast(rm, protocol.GameStartMsg{
				Type:      protocol.TypeGameStart,
				Countdown: 3,
			})
			go game.Run(rm, s.hub, s.manager, s.persistMultiplayerMatch)
		}

	case protocol.TypeSubmitAnswer:
		if *currentRoomID == "" {
			return
		}
		rm, ok := s.manager.GetByID(*currentRoomID)
		if !ok {
			return
		}
		select {
		case rm.AnswerChan <- room.AnswerEvent{
			UID:         uid,
			QuestionID:  msg.QuestionID,
			SelectedIDs: msg.SelectedIDs,
			ReceivedAt:  time.Now().UnixMilli(),
		}:
		default:
		}
		s.send(uid, protocol.AnswerAckMsg{
			Type:       protocol.TypeAnswerAck,
			Accepted:   true,
			QuestionID: msg.QuestionID,
		})

	case protocol.TypeReconnect:
		if msg.RoomID == "" || msg.UID == "" {
			s.sendError(uid, "invalid_input", "roomId and uid are required")
			return
		}

		rm, ok := s.manager.GetByID(msg.RoomID)
		if !ok {
			// Room not in memory — try to restore from Redis.
			var questionIDs []string
			var startIndex int
			var scores map[string]int
			rm, questionIDs, startIndex, scores, ok = s.manager.RestoreFromRedis(msg.RoomID)
			if !ok {
				s.sendError(uid, "room_not_found", "Room not found")
				return
			}
			if !rm.HasPlayer(msg.UID) {
				s.sendError(uid, "not_in_room", "UID does not belong to this room")
				return
			}
			oldUID := msg.UID
			s.hub.Reassign(uid, oldUID)
			*currentRoomID = rm.ID

			// Start resume AFTER hub is updated so the question broadcast lands.
			if rm.Status == room.StatusPlaying && len(questionIDs) > 0 {
				log.Printf("[ws] resuming room %s from question %d after restart", rm.ID, startIndex)
				go game.Resume(rm, s.hub, s.manager, questionIDs, startIndex, scores, s.persistMultiplayerMatch)
			}

			if rm.Status == room.StatusPlaying {
				select {
				case rm.ReconnectChan <- oldUID:
				default:
				}
			} else {
				rm.SetConnected(oldUID, true)
				s.broadcastPlayerList(rm)
			}
			log.Printf("[ws] %s reconnected as %s in room %s", uid, oldUID, rm.ID)
			return
		}

		if !rm.HasPlayer(msg.UID) {
			s.sendError(uid, "not_in_room", "UID does not belong to this room")
			return
		}

		oldUID := msg.UID
		s.hub.Reassign(uid, oldUID)
		*currentRoomID = rm.ID

		if rm.Status == room.StatusPlaying {
			select {
			case rm.ReconnectChan <- oldUID:
			default:
			}
		} else {
			rm.SetConnected(oldUID, true)
			s.broadcastPlayerList(rm)
		}
		log.Printf("[ws] %s reconnected as %s in room %s", uid, oldUID, rm.ID)

	default:
		log.Printf("[ws] unknown message type %q from %s", msg.Type, uid)
	}
}

func (s *server) persistMultiplayerMatch(rm *room.Room, result game.MatchResult) {
	for _, player := range rm.GetPlayers() {
		if strings.TrimSpace(player.UserID) == "" {
			continue
		}

		attempts := result.Attempts[player.UID]
		if len(attempts) == 0 {
			continue
		}

		correctAnswers := 0
		sessionAttempts := make([]learning.SessionAttempt, 0, len(attempts))
		for _, attempt := range attempts {
			if attempt.IsCorrect {
				correctAnswers++
			}
			sessionAttempts = append(sessionAttempts, learning.SessionAttempt{
				QuestionID:        attempt.QuestionID,
				CategoryID:        attempt.CategoryID,
				AnsweredAt:        attempt.AnsweredAt,
				ResponseTimeMS:    attempt.ResponseTimeMS,
				IsCorrect:         attempt.IsCorrect,
				SelectedOptionIDs: attempt.SelectedOptionIDs,
			})
		}

		accuracy := 0.0
		if len(attempts) > 0 {
			accuracy = float64(correctAnswers) * 100 / float64(len(attempts))
		}

		durationSec := int(result.CompletedAt.Sub(result.StartedAt).Seconds())
		if durationSec < 0 {
			durationSec = 0
		}

		if _, err := s.learning.SaveSession(context.Background(), learning.SaveSessionInput{
			UserID:         player.UserID,
			Mode:           "multiplayer",
			Source:         "web",
			StartedAt:      result.StartedAt,
			CompletedAt:    result.CompletedAt,
			DurationSec:    durationSec,
			TotalQuestions: len(attempts),
			CorrectAnswers: correctAnswers,
			Accuracy:       accuracy,
			Attempts:       sessionAttempts,
		}); err != nil {
			log.Printf("[learning] failed to save multiplayer session for user %s in room %s: %v", player.UserID, rm.ID, err)
		}
	}
}

func (s *server) broadcastPlayerList(rm *room.Room) {
	players := rm.GetPlayers()
	infos := make([]protocol.PlayerInfo, len(players))
	for i, p := range players {
		infos[i] = protocol.PlayerInfo{
			UID:   p.UID,
			Name:  p.Name,
			Score: p.Score,
			Ready: p.Ready,
		}
	}
	s.broadcast(rm, protocol.PlayerJoinedMsg{
		Type:    protocol.TypePlayerJoined,
		RoomID:  rm.ID,
		Code:    rm.Code,
		Players: infos,
	})
}

func (s *server) send(uid string, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[server] marshal error: %v", err)
		return
	}
	s.hub.Send(uid, data)
}

func (s *server) broadcast(rm *room.Room, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[server] marshal error: %v", err)
		return
	}
	for _, p := range rm.GetPlayers() {
		s.hub.Send(p.UID, data)
	}
}

func (s *server) sendError(uid, code, message string) {
	s.send(uid, protocol.ErrorMsg{
		Type:    protocol.TypeError,
		Code:    code,
		Message: message,
	})
}

func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := auth.MustFromRequest(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	response := map[string]any{
		"user": map[string]string{
			"id":          authCtx.User.ID,
			"firebaseUid": authCtx.User.FirebaseUID,
			"email":       authCtx.User.Email,
			"displayName": authCtx.User.DisplayName,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response) //nolint:errcheck
}

func (s *server) handleHistory(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := auth.MustFromRequest(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	sessions, err := s.learning.ListSessionsByUser(r.Context(), authCtx.User.ID, 50)
	if err != nil {
		http.Error(w, "failed to load history", http.StatusInternalServerError)
		return
	}

	type historyItem struct {
		ID             string `json:"id"`
		Date           string `json:"date"`
		TotalScore     int    `json:"totalScore"`
		TotalQuestions int    `json:"totalQuestions"`
		TotalTimeMS    int    `json:"totalTimeMs"`
	}

	items := make([]historyItem, 0, len(sessions))
	for _, session := range sessions {
		items = append(items, historyItem{
			ID:             session.ID,
			Date:           session.Date.Format(time.RFC3339),
			TotalScore:     session.TotalScore,
			TotalQuestions: session.TotalQuestions,
			TotalTimeMS:    session.TotalTimeMS,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"sessions": items}) //nolint:errcheck
}

func (s *server) handleWeakAreas(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := auth.MustFromRequest(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	weakAreas, err := s.learning.ListWeakAreasByUser(r.Context(), authCtx.User.ID, 5)
	if err != nil {
		http.Error(w, "failed to load weak areas", http.StatusInternalServerError)
		return
	}

	type weakAreaItem struct {
		QuestionID        string  `json:"questionId"`
		CategoryID        string  `json:"categoryId"`
		Attempts          int     `json:"attempts"`
		CorrectCount      int     `json:"correctCount"`
		IncorrectCount    int     `json:"incorrectCount"`
		Accuracy          float64 `json:"accuracy"`
		LastAttemptAt     string  `json:"lastAttemptAt"`
		LastCorrect       bool    `json:"lastCorrect"`
		AvgResponseTimeMS int     `json:"avgResponseTimeMs"`
	}

	items := make([]weakAreaItem, 0, len(weakAreas))
	for _, area := range weakAreas {
		items = append(items, weakAreaItem{
			QuestionID:        area.QuestionID,
			CategoryID:        area.CategoryID,
			Attempts:          area.Attempts,
			CorrectCount:      area.CorrectCount,
			IncorrectCount:    area.IncorrectCount,
			Accuracy:          area.Accuracy,
			LastAttemptAt:     area.LastAttemptAt.Format(time.RFC3339),
			LastCorrect:       area.LastCorrect,
			AvgResponseTimeMS: area.AvgResponseTimeMS,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"weakAreas": items}) //nolint:errcheck
}

func (s *server) handleCategoryAccuracy(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := auth.MustFromRequest(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	categoryAccuracy, err := s.learning.ListCategoryAccuracyByUser(r.Context(), authCtx.User.ID)
	if err != nil {
		http.Error(w, "failed to load category accuracy", http.StatusInternalServerError)
		return
	}

	type categoryAccuracyItem struct {
		CategoryID string `json:"categoryId"`
		Correct    int    `json:"correct"`
		Total      int    `json:"total"`
	}

	items := make([]categoryAccuracyItem, 0, len(categoryAccuracy))
	for _, item := range categoryAccuracy {
		items = append(items, categoryAccuracyItem{
			CategoryID: item.CategoryID,
			Correct:    item.Correct,
			Total:      item.Total,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{"categories": items}) //nolint:errcheck
}

type saveSessionRequest struct {
	Mode           string `json:"mode"`
	StartedAt      string `json:"startedAt"`
	CompletedAt    string `json:"completedAt"`
	TotalQuestions int    `json:"totalQuestions"`
	CorrectAnswers int    `json:"correctAnswers"`
	Attempts       []struct {
		QuestionID        string   `json:"questionId"`
		CategoryID        string   `json:"categoryId"`
		AnsweredAt        string   `json:"answeredAt"`
		ResponseTimeMS    int      `json:"responseTimeMs"`
		IsCorrect         bool     `json:"isCorrect"`
		SelectedOptionIDs []string `json:"selectedOptionIds"`
	} `json:"attempts"`
}

func (s *server) handleSaveSession(w http.ResponseWriter, r *http.Request) {
	authCtx, ok := auth.MustFromRequest(r)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	var req saveSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	startedAt, err := time.Parse(time.RFC3339, req.StartedAt)
	if err != nil {
		http.Error(w, "invalid startedAt", http.StatusBadRequest)
		return
	}
	completedAt, err := time.Parse(time.RFC3339, req.CompletedAt)
	if err != nil {
		http.Error(w, "invalid completedAt", http.StatusBadRequest)
		return
	}

	attempts := make([]learning.SessionAttempt, 0, len(req.Attempts))
	for _, attempt := range req.Attempts {
		answeredAt, err := time.Parse(time.RFC3339, attempt.AnsweredAt)
		if err != nil {
			http.Error(w, "invalid attempt answeredAt", http.StatusBadRequest)
			return
		}
		attempts = append(attempts, learning.SessionAttempt{
			QuestionID:        attempt.QuestionID,
			CategoryID:        attempt.CategoryID,
			AnsweredAt:        answeredAt,
			ResponseTimeMS:    attempt.ResponseTimeMS,
			IsCorrect:         attempt.IsCorrect,
			SelectedOptionIDs: attempt.SelectedOptionIDs,
		})
	}

	durationSec := int(completedAt.Sub(startedAt).Seconds())
	accuracy := 0.0
	if req.TotalQuestions > 0 {
		accuracy = float64(req.CorrectAnswers) * 100 / float64(req.TotalQuestions)
	}

	sessionID, err := s.learning.SaveSession(r.Context(), learning.SaveSessionInput{
		UserID:         authCtx.User.ID,
		Mode:           req.Mode,
		Source:         "web",
		StartedAt:      startedAt,
		CompletedAt:    completedAt,
		DurationSec:    durationSec,
		TotalQuestions: req.TotalQuestions,
		CorrectAnswers: req.CorrectAnswers,
		Accuracy:       accuracy,
		Attempts:       attempts,
	})
	if err != nil {
		http.Error(w, "failed to save session", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"sessionId": sessionID}) //nolint:errcheck
}

func main() {
	config.LoadEnvFiles()
	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("[server] invalid config: %v", err)
	}
	ctx := context.Background()

	rdb := cache.New(cfg.RedisAddr)
	if err := cache.Ping(ctx, rdb); err != nil {
		log.Fatalf("[server] redis unavailable: %v", err)
	}
	log.Println("[server] redis ok")

	pg, err := db.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("[server] postgres config invalid: %v", err)
	}
	defer pg.Close()
	if err := db.Ping(ctx, pg); err != nil {
		log.Fatalf("[server] postgres unavailable: %v", err)
	}
	log.Println("[server] postgres ok")

	userRepo := users.NewPostgresRepository(pg)
	learningRepo := learning.NewPostgresRepository(pg)
	authVerifier := auth.Verifier(auth.NoopVerifier{})
	if firebaseVerifier, err := auth.NewFirebaseVerifier(ctx, cfg); err != nil {
		log.Printf("[server] firebase auth not configured: %v", err)
	} else {
		authVerifier = firebaseVerifier
		log.Println("[server] firebase auth ok")
	}

	srv := newServer(rdb, pg, userRepo, authVerifier, learningRepo)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(chicors.Handler(chicors.Options{
		AllowedOrigins: cfg.AllowedOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		MaxAge:         300,
	}))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		ctx := r.Context()
		redisErr := cache.Ping(ctx, rdb)
		postgresErr := db.Ping(ctx, pg)

		status := http.StatusOK
		if redisErr != nil || postgresErr != nil {
			status = http.StatusServiceUnavailable
		}

		payload := map[string]string{
			"status":   "ok",
			"redis":    "ok",
			"postgres": "ok",
		}
		if redisErr != nil || postgresErr != nil {
			payload["status"] = "degraded"
		}
		if redisErr != nil {
			payload["redis"] = redisErr.Error()
		}
		if postgresErr != nil {
			payload["postgres"] = postgresErr.Error()
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		json.NewEncoder(w).Encode(payload) //nolint:errcheck
	})

	r.Get("/ws", srv.handleWS)

	r.Route("/api", func(r chi.Router) {
		r.Group(func(r chi.Router) {
			r.Use(auth.Middleware(authVerifier, userRepo))
			r.Get("/me", srv.handleMe)
			r.Get("/me/history", srv.handleHistory)
			r.Get("/me/weak-areas", srv.handleWeakAreas)
			r.Get("/me/category-accuracy", srv.handleCategoryAccuracy)
			r.Post("/learning/sessions", srv.handleSaveSession)
		})
	})

	log.Printf("[server] listening on %s", cfg.ListenAddr())
	if err := http.ListenAndServe(cfg.ListenAddr(), r); err != nil {
		log.Fatalf("[server] fatal: %v", err)
	}
}

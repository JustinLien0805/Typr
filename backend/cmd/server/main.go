package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/redis/go-redis/v9"

	"typr/backend/internal/cache"
	"typr/backend/internal/config"
	"typr/backend/internal/db"
	"typr/backend/internal/game"
	"typr/backend/internal/protocol"
	"typr/backend/internal/room"
	iws "typr/backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

type server struct {
	hub     *iws.Hub
	manager *room.Manager
	pg      *pgxpool.Pool
}

func newServer(rdb *redis.Client, pg *pgxpool.Pool) *server {
	return &server{
		hub:     iws.NewHub(),
		manager: room.NewManager(rdb),
		pg:      pg,
	}
}

func (s *server) handleWS(w http.ResponseWriter, r *http.Request) {
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
			s.handleMessage(currentUID, &currentRoomID, msg)
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

func (s *server) handleMessage(uid string, currentRoomID *string, msg *protocol.InboundMessage) {
	switch msg.Type {

	case protocol.TypeCreateRoom:
		if msg.PlayerName == "" {
			s.sendError(uid, "invalid_input", "playerName is required")
			return
		}
		rm := s.manager.Create(uid, msg.PlayerName)
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
		if !rm.AddPlayer(uid, msg.PlayerName) {
			s.sendError(uid, "room_full", "Room already has 2 players")
			return
		}
		*currentRoomID = rm.ID
		s.manager.PersistPlayerJoin(rm.ID, uid, msg.PlayerName)
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
			go game.Run(rm, s.hub, s.manager)
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
				go game.Resume(rm, s.hub, s.manager, questionIDs, startIndex, scores)
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

func main() {
	cfg := config.Load()
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

	srv := newServer(rdb, pg)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

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

	log.Printf("[server] listening on %s", cfg.ListenAddr())
	if err := http.ListenAndServe(cfg.ListenAddr(), r); err != nil {
		log.Fatalf("[server] fatal: %v", err)
	}
}

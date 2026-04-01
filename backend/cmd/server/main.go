package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"

	"typr/backend/internal/game"
	"typr/backend/internal/protocol"
	"typr/backend/internal/room"
	iws "typr/backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	// Allow all origins during development.
	// TODO: restrict to your frontend origin in production.
	CheckOrigin: func(r *http.Request) bool { return true },
}

// server wires the hub and room manager together and owns the HTTP handlers.
type server struct {
	hub     *iws.Hub
	manager *room.Manager
}

func newServer() *server {
	return &server{
		hub:     iws.NewHub(),
		manager: room.NewManager(),
	}
}

// handleWS upgrades the connection and starts the client goroutines.
func (s *server) handleWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[ws] upgrade error: %v", err)
		return
	}

	// Temporary UID — replaced by Firebase UID in Phase 5.
	uid := room.GenerateID()

	// currentRoomID is captured by both closures below; the readPump goroutine
	// is the sole writer so no mutex is needed.
	var currentRoomID string

	client := iws.NewClient(
		uid, conn, s.hub,
		func(_ string, msg *protocol.InboundMessage) {
			s.handleMessage(uid, &currentRoomID, msg)
		},
		func(_ string) {
			// Connection closed — notify the room game loop (Phase 2).
			if currentRoomID != "" {
				if rm, ok := s.manager.GetByID(currentRoomID); ok {
					select {
					case rm.DisconnectChan <- uid:
					default:
					}
				}
			}
		},
	)

	s.hub.Register(uid, client)

	// Tell the client its assigned UID.
	s.send(uid, protocol.ConnectedMsg{Type: protocol.TypeConnected, UID: uid})

	client.Run() // blocks until connection closes
}

// handleMessage dispatches an inbound message to the appropriate handler.
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
		// Deliver the answer to the game loop goroutine.
		// ReceivedAt is set here (server time) so the game loop can compute elapsed accurately.
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
		// Client sends: { type: "reconnect", roomId: "...", uid: "oldUID" }
		// The "uid" field carries the player's previous temporary UID.
		// In Phase 5 this is replaced by Firebase JWT verification.
		if msg.RoomID == "" || msg.UID == "" {
			s.sendError(uid, "invalid_input", "roomId and uid are required")
			return
		}
		rm, ok := s.manager.GetByID(msg.RoomID)
		if !ok {
			s.sendError(uid, "room_not_found", "Room not found")
			return
		}
		if !rm.HasPlayer(msg.UID) {
			s.sendError(uid, "not_in_room", "UID does not belong to this room")
			return
		}

		// Re-register the new WebSocket connection under the old UID.
		// Hub.Register closes any existing (dead) connection for that UID first.
		oldUID := msg.UID
		s.hub.Reassign(uid, oldUID)
		*currentRoomID = rm.ID

		// Signal the game loop to cancel the grace timer for this player.
		select {
		case rm.ReconnectChan <- oldUID:
		default:
		}
		log.Printf("[ws] %s reconnected as %s in room %s", uid, oldUID, rm.ID)

	default:
		log.Printf("[ws] unknown message type %q from %s", msg.Type, uid)
	}
}

// broadcastPlayerList sends the current player list to everyone in the room.
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

// send marshals v and enqueues it for a single client.
func (s *server) send(uid string, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[server] marshal error: %v", err)
		return
	}
	s.hub.Send(uid, data)
}

// broadcast marshals v and sends it to every player in the room.
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
	srv := newServer()

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	r.Get("/ws", srv.handleWS)

	log.Println("[server] listening on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("[server] fatal: %v", err)
	}
}

package room

import "sync"

// Status represents the lifecycle state of a room.
type Status string

const (
	StatusLobby    Status = "lobby"
	StatusPlaying  Status = "playing"
	StatusFinished Status = "finished"
)

// Player holds per-player state within a room.
type Player struct {
	UID       string
	Name      string
	UserID    string
	Score     int
	Ready     bool
	Connected bool
}

// AnswerEvent is sent on AnswerChan when a player submits an answer.
type AnswerEvent struct {
	UID         string
	QuestionID  string
	SelectedIDs []string
	ReceivedAt  int64 // Unix ms — set by the server at receipt, never trust client time
}

// Room holds the shared state for one match.
// The game loop goroutine is the sole writer to game-phase fields;
// player map mutations and current-question state are guarded by mu.
type Room struct {
	ID     string
	Code   string
	Status Status

	mu      sync.RWMutex
	Players map[string]*Player // uid → player

	// Current question snapshot — written by the game loop, read by the
	// reconnect handler to restore a returning player's UI state.
	currentQuestionID string
	currentStartedAt  int64

	// Channels consumed by the game loop goroutine.
	AnswerChan     chan AnswerEvent
	DisconnectChan chan string // uid of disconnecting player
	ReconnectChan  chan string // uid of reconnecting player
}

func newRoom(id, code, hostUID, hostName, hostUserID string) *Room {
	return &Room{
		ID:     id,
		Code:   code,
		Status: StatusLobby,
		Players: map[string]*Player{
			hostUID: {UID: hostUID, Name: hostName, UserID: hostUserID, Connected: true},
		},
		AnswerChan:     make(chan AnswerEvent, 2),
		DisconnectChan: make(chan string, 2),
		ReconnectChan:  make(chan string, 2),
	}
}

// AddPlayer adds a guest. Returns false if the room is already full (max 2).
func (r *Room) AddPlayer(uid, name, userID string) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.Players) >= 2 {
		return false
	}
	r.Players[uid] = &Player{UID: uid, Name: name, UserID: userID, Connected: true}
	return true
}

// GetPlayers returns a snapshot of all players.
func (r *Room) GetPlayers() []Player {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]Player, 0, len(r.Players))
	for _, p := range r.Players {
		out = append(out, *p)
	}
	return out
}

// IsFull reports whether the room already has 2 players.
func (r *Room) IsFull() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.Players) >= 2
}

// HasPlayer reports whether uid belongs to this room.
func (r *Room) HasPlayer(uid string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	_, ok := r.Players[uid]
	return ok
}

// SetReady marks a player as ready.
func (r *Room) SetReady(uid string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p, ok := r.Players[uid]; ok {
		p.Ready = true
	}
}

// AllReady reports whether all players (min 2) are ready.
func (r *Room) AllReady() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if len(r.Players) < 2 {
		return false
	}
	for _, p := range r.Players {
		if !p.Ready {
			return false
		}
	}
	return true
}

// SetConnected updates a player's connection flag.
func (r *Room) SetConnected(uid string, connected bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if p, ok := r.Players[uid]; ok {
		p.Connected = connected
	}
}

// IsConnected reports the connection state for uid.
func (r *Room) IsConnected(uid string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	if p, ok := r.Players[uid]; ok {
		return p.Connected
	}
	return false
}

// OpponentUID returns the UID of the other player, or "" if not found.
func (r *Room) OpponentUID(uid string) string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	for id := range r.Players {
		if id != uid {
			return id
		}
	}
	return ""
}

// SetCurrentQuestion is called by the game loop at the start of each question
// so that a reconnecting player can be caught up.
func (r *Room) SetCurrentQuestion(id string, startedAt int64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.currentQuestionID = id
	r.currentStartedAt = startedAt
}

// GetCurrentQuestion returns the current question snapshot.
func (r *Room) GetCurrentQuestion() (id string, startedAt int64) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.currentQuestionID, r.currentStartedAt
}

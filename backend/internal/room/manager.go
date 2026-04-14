package room

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"strconv"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

const roomTTL = 2 * time.Hour

// Manager owns all active rooms and provides thread-safe lookup.
type Manager struct {
	mu          sync.RWMutex
	rooms       map[string]*Room  // roomId  → room
	codes       map[string]string // code    → roomId
	resuming    map[string]bool   // roomId  → resume loop already launched
	rdb         *redis.Client
	restoreOnce singleflight.Group
}

func NewManager(rdb *redis.Client) *Manager {
	return &Manager{
		rooms:    make(map[string]*Room),
		codes:    make(map[string]string),
		resuming: make(map[string]bool),
		rdb:      rdb,
	}
}

func (m *Manager) Rdb() *redis.Client { return m.rdb }

// Create initialises a new room, registers it, and returns it.
func (m *Manager) Create(hostUID, hostName, hostUserID string) *Room {
	id := GenerateID()
	code := m.generateUniqueCode()
	r := newRoom(id, code, hostUID, hostName, hostUserID)

	m.mu.Lock()
	m.rooms[id] = r
	m.codes[code] = id
	m.mu.Unlock()

	ctx := context.Background()
	pipe := m.rdb.Pipeline()
	pipe.HSet(ctx, "room:"+id+":meta", "code", code, "status", "lobby", "hostUid", hostUID)
	pipe.Expire(ctx, "room:"+id+":meta", roomTTL)
	pipe.Set(ctx, "code:"+code, id, roomTTL)
	playerJSON, _ := json.Marshal(Player{UID: hostUID, Name: hostName, UserID: hostUserID, Connected: true})
	pipe.HSet(ctx, "room:"+id+":players", hostUID, playerJSON)
	pipe.Expire(ctx, "room:"+id+":players", roomTTL)
	pipe.Exec(ctx) //nolint:errcheck

	return r
}

// PersistPlayerJoin writes a newly joined player to Redis.
func (m *Manager) PersistPlayerJoin(roomID string, p Player) {
	p.Connected = true
	data, _ := json.Marshal(p)
	ctx := context.Background()
	m.rdb.HSet(ctx, "room:"+roomID+":players", p.UID, data)
}

// PersistQuestion writes the current question state to Redis so it survives a restart.
func (m *Manager) PersistQuestion(roomID string, questions []string, index int, qID string, startedAt int64) {
	qJSON, _ := json.Marshal(questions)
	ctx := context.Background()
	m.rdb.HSet(ctx, "room:"+roomID+":meta",
		"status", "playing",
		"questions", string(qJSON),
		"qIndex", strconv.Itoa(index),
		"qId", qID,
		"startedAt", strconv.FormatInt(startedAt, 10),
	)
	m.rdb.Expire(ctx, "room:"+roomID+":meta", roomTTL)
}

// PersistScores writes the current score map to Redis.
func (m *Manager) PersistScores(roomID string, scores map[string]int) {
	args := make([]any, 0, len(scores)*2)
	for uid, score := range scores {
		args = append(args, uid, strconv.Itoa(score))
	}
	if len(args) == 0 {
		return
	}
	ctx := context.Background()
	m.rdb.HSet(ctx, "room:"+roomID+":scores", args...)
	m.rdb.Expire(ctx, "room:"+roomID+":scores", roomTTL)
}

type restoreResult struct {
	room         *Room
	questionIDs  []string
	startIndex   int
	scores       map[string]int
	ok           bool
	freshRestore bool
}

// RestoreFromRedis recreates an in-memory Room from Redis data.
// Returns (room, questionIDs, startIndex, scores, ok, freshRestore).
// questionIDs and startIndex are only populated when status == "playing".
func (m *Manager) RestoreFromRedis(id string) (*Room, []string, int, map[string]int, bool, bool) {
	// Check in-memory first (another goroutine may have already restored it).
	m.mu.RLock()
	if r, ok := m.rooms[id]; ok {
		m.mu.RUnlock()
		return r, nil, 0, nil, true, false
	}
	m.mu.RUnlock()

	value, _, _ := m.restoreOnce.Do(id, func() (any, error) {
		// Check again inside the singleflight leader path in case another
		// request restored the room before we got here.
		m.mu.RLock()
		if r, ok := m.rooms[id]; ok {
			m.mu.RUnlock()
			return restoreResult{room: r, ok: true, freshRestore: false}, nil
		}
		m.mu.RUnlock()

		ctx := context.Background()

		meta, err := m.rdb.HGetAll(ctx, "room:"+id+":meta").Result()
		if err != nil || len(meta) == 0 {
			return restoreResult{ok: false}, nil
		}

		playersRaw, err := m.rdb.HGetAll(ctx, "room:"+id+":players").Result()
		if err != nil || len(playersRaw) == 0 {
			return restoreResult{ok: false}, nil
		}

		code := meta["code"]
		if code == "" {
			return restoreResult{ok: false}, nil
		}

		players := make(map[string]*Player)
		for uid, raw := range playersRaw {
			var p Player
			if json.Unmarshal([]byte(raw), &p) == nil {
				p.Connected = false // offline until they reconnect
				players[uid] = &p
			}
		}
		if len(players) == 0 {
			return restoreResult{ok: false}, nil
		}

		r := &Room{
			ID:             id,
			Code:           code,
			Status:         Status(meta["status"]),
			Players:        players,
			AnswerChan:     make(chan AnswerEvent, 2),
			DisconnectChan: make(chan string, 2),
			ReconnectChan:  make(chan string, 2),
		}

		var questionIDs []string
		var startIndex int
		scores := make(map[string]int)

		if r.Status == StatusPlaying {
			if qJSON := meta["questions"]; qJSON != "" {
				json.Unmarshal([]byte(qJSON), &questionIDs) //nolint:errcheck
			}
			if s := meta["qIndex"]; s != "" {
				startIndex, _ = strconv.Atoi(s)
			}
			if qID := meta["qId"]; qID != "" {
				r.currentQuestionID = qID
			}
			if s := meta["startedAt"]; s != "" {
				sat, _ := strconv.ParseInt(s, 10, 64)
				r.currentStartedAt = sat
			}
			scoresRaw, _ := m.rdb.HGetAll(ctx, "room:"+id+":scores").Result()
			for uid, s := range scoresRaw {
				scores[uid], _ = strconv.Atoi(s)
			}
			for uid := range players {
				if _, ok := scores[uid]; !ok {
					scores[uid] = 0
				}
			}
		}

		m.mu.Lock()
		// Another waiter could have installed the room while this leader was
		// reading Redis; if so, reuse the canonical in-memory copy.
		if existing, ok := m.rooms[id]; ok {
			m.mu.Unlock()
			return restoreResult{
				room:         existing,
				questionIDs:  questionIDs,
				startIndex:   startIndex,
				scores:       scores,
				ok:           true,
				freshRestore: false,
			}, nil
		}
		m.rooms[id] = r
		m.codes[code] = id
		m.resuming[id] = false
		m.mu.Unlock()

		return restoreResult{
			room:         r,
			questionIDs:  questionIDs,
			startIndex:   startIndex,
			scores:       scores,
			ok:           true,
			freshRestore: true,
		}, nil
	})

	result := value.(restoreResult)
	return result.room, result.questionIDs, result.startIndex, result.scores, result.ok, result.freshRestore
}

// MarkResumeStarted returns true only for the first caller that is allowed to
// launch a resumed game loop for this room.
func (m *Manager) MarkResumeStarted(roomID string) bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.resuming[roomID] {
		return false
	}
	m.resuming[roomID] = true
	return true
}

// GetByCode looks up a room by its 6-character join code.
func (m *Manager) GetByCode(code string) (*Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	id, ok := m.codes[code]
	if !ok {
		return nil, false
	}
	r, ok := m.rooms[id]
	return r, ok
}

// GetByID looks up a room by its internal ID.
func (m *Manager) GetByID(id string) (*Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.rooms[id]
	return r, ok
}

// Delete removes a room from memory and Redis.
func (m *Manager) Delete(roomID string) {
	m.mu.Lock()
	code := ""
	if r, ok := m.rooms[roomID]; ok {
		code = r.Code
		delete(m.codes, code)
		delete(m.rooms, roomID)
	}
	delete(m.resuming, roomID)
	m.mu.Unlock()

	ctx := context.Background()
	pipe := m.rdb.Pipeline()
	pipe.Del(ctx, "room:"+roomID+":meta")
	pipe.Del(ctx, "room:"+roomID+":players")
	pipe.Del(ctx, "room:"+roomID+":scores")
	if code != "" {
		pipe.Del(ctx, "code:"+code)
	}
	pipe.Exec(ctx) //nolint:errcheck
}

// generateUniqueCode produces a 6-character alphanumeric code not already in use.
// Ambiguous characters (0, O, I, 1) are excluded for readability.
func (m *Manager) generateUniqueCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for {
		b := make([]byte, 6)
		rand.Read(b) //nolint:errcheck
		for i, v := range b {
			b[i] = charset[int(v)%len(charset)]
		}
		code := string(b)
		m.mu.RLock()
		_, exists := m.codes[code]
		m.mu.RUnlock()
		if !exists {
			return code
		}
	}
}

// GenerateID returns a 16-byte hex string suitable for use as a room or player ID.
func GenerateID() string {
	b := make([]byte, 16)
	rand.Read(b) //nolint:errcheck
	return fmt.Sprintf("%x", b)
}

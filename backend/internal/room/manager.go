package room

import (
	"crypto/rand"
	"fmt"
	"sync"
)

// Manager owns all active rooms and provides thread-safe lookup.
type Manager struct {
	mu    sync.RWMutex
	rooms map[string]*Room  // roomId  → room
	codes map[string]string // code    → roomId
}

func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*Room),
		codes: make(map[string]string),
	}
}

// Create initialises a new room, registers it, and returns it.
func (m *Manager) Create(hostUID, hostName string) *Room {
	id := GenerateID()
	code := m.generateUniqueCode()
	r := newRoom(id, code, hostUID, hostName)

	m.mu.Lock()
	m.rooms[id] = r
	m.codes[code] = id
	m.mu.Unlock()

	return r
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

// Delete removes a room and its code mapping.
func (m *Manager) Delete(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rooms[roomID]; ok {
		delete(m.codes, r.Code)
		delete(m.rooms, roomID)
	}
}

// generateUniqueCode produces a 6-character alphanumeric code not already in use.
// Ambiguous characters (0, O, I, 1) are excluded for readability.
func (m *Manager) generateUniqueCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	for {
		b := make([]byte, 6)
		rand.Read(b) //nolint:errcheck // crypto/rand never errors on standard platforms
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

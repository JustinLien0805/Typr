package ws

import "sync"

// Hub is the central registry of all active WebSocket clients, keyed by UID.
// It is safe for concurrent use.
type Hub struct {
	mu      sync.RWMutex
	clients map[string]*Client
}

func NewHub() *Hub {
	return &Hub{
		clients: make(map[string]*Client),
	}
}

// Register adds a client. If a client with the same UID already exists (e.g.
// reconnect from a second tab), the old connection is closed first.
func (h *Hub) Register(uid string, c *Client) {
	h.mu.Lock()
	existing := h.clients[uid]
	h.clients[uid] = c
	h.mu.Unlock()

	if existing != nil && existing != c {
		existing.close()
	}
}

// Unregister removes a client by UID only if it is still the active client for
// that UID. Returns true when the caller actually owned the slot.
func (h *Hub) Unregister(uid string, c *Client) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	active, ok := h.clients[uid]
	if !ok || active != c {
		return false
	}
	delete(h.clients, uid)
	return true
}

// Send enqueues a message for the client with the given UID.
// Silently drops if the client is not found.
func (h *Hub) Send(uid string, msg []byte) {
	h.mu.RLock()
	c, ok := h.clients[uid]
	h.mu.RUnlock()
	if ok {
		c.enqueue(msg)
	}
}

// Reassign moves a live connection from its temporary newUID to the player's
// permanent oldUID. Used when a player reconnects and gets a new temp UID from
// handleWS but needs to resume their previous identity in the room.
// Any stale connection still registered under oldUID is closed first.
func (h *Hub) Reassign(newUID, oldUID string) {
	h.mu.Lock()
	c, ok := h.clients[newUID]
	if !ok {
		h.mu.Unlock()
		return
	}
	stale := h.clients[oldUID]
	delete(h.clients, newUID)
	c.uid = oldUID
	h.clients[oldUID] = c
	h.mu.Unlock()

	// Close stale connection after the reassignment is visible. Its deferred
	// cleanup will be ignored unless it still owns oldUID.
	if stale != nil && stale != c {
		stale.close()
	}
}

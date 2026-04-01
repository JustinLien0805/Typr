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
	defer h.mu.Unlock()
	if existing, ok := h.clients[uid]; ok {
		existing.close()
	}
	h.clients[uid] = c
}

// Unregister removes a client by UID.
func (h *Hub) Unregister(uid string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, uid)
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
	defer h.mu.Unlock()
	c, ok := h.clients[newUID]
	if !ok {
		return
	}
	// Close stale connection for oldUID if present.
	if stale, ok := h.clients[oldUID]; ok {
		stale.close()
	}
	delete(h.clients, newUID)
	c.uid = oldUID
	h.clients[oldUID] = c
}

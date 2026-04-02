package ws

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
	"typr/backend/internal/protocol"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

// Client wraps a single WebSocket connection.
// It runs two goroutines: readPump and writePump.
type Client struct {
	uid     string
	conn    *websocket.Conn
	send    chan []byte
	hub     *Hub
	onMsg   func(uid string, msg *protocol.InboundMessage)
	onClose func(uid string)
}

func NewClient(
	uid string,
	conn *websocket.Conn,
	hub *Hub,
	onMsg func(string, *protocol.InboundMessage),
	onClose func(string),
) *Client {
	return &Client{
		uid:     uid,
		conn:    conn,
		send:    make(chan []byte, 256),
		hub:     hub,
		onMsg:   onMsg,
		onClose: onClose,
	}
}

// Run starts the read and write pumps. Blocks until the connection closes.
func (c *Client) Run() {
	go c.writePump()
	c.readPump() // blocks
}

// enqueue adds a message to the send buffer. Called from Hub.Send.
func (c *Client) enqueue(msg []byte) {
	select {
	case c.send <- msg:
	default:
		// Buffer full — close the connection so readPump exits cleanly.
		c.close()
	}
}

// close terminates the underlying connection.
func (c *Client) close() {
	c.conn.Close()
}

func (c *Client) readPump() {
	defer func() {
		ownedSlot := c.hub.Unregister(c.uid, c)
		c.conn.Close()
		if ownedSlot && c.onClose != nil {
			c.onClose(c.uid)
		}
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[ws] client %s read error: %v", c.uid, err)
			}
			break
		}
		var msg protocol.InboundMessage
		if err := json.Unmarshal(data, &msg); err != nil {
			log.Printf("[ws] client %s bad JSON: %v", c.uid, err)
			continue
		}
		if c.onMsg != nil {
			c.onMsg(c.uid, &msg)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

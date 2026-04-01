package protocol

// Inbound message types (client → server)
const (
	TypeCreateRoom   = "create_room"
	TypeJoinRoom     = "join_room"
	TypeSetReady     = "set_ready"
	TypeSubmitAnswer = "submit_answer"
	TypeReconnect    = "reconnect"
)

// Outbound message types (server → client)
const (
	TypeConnected            = "connected"
	TypeRoomCreated          = "room_created"
	TypePlayerJoined         = "player_joined"
	TypeGameStart            = "game_start"
	TypeQuestion             = "question"
	TypeAnswerAck            = "answer_ack"
	TypeOpponentAnswered     = "opponent_answered"
	TypeReveal               = "reveal"
	TypeGameEnd              = "game_end"
	TypeOpponentDisconnected = "opponent_disconnected"
	TypeOpponentReconnected  = "opponent_reconnected"
	TypeReconnectAck         = "reconnect_ack"
	TypeError                = "error"
)

// InboundMessage is the generic envelope for all client→server messages.
// Only the fields relevant to each type will be populated.
type InboundMessage struct {
	Type        string   `json:"type"`
	PlayerName  string   `json:"playerName,omitempty"`
	Code        string   `json:"code,omitempty"`
	RoomID      string   `json:"roomId,omitempty"`
	UID         string   `json:"uid,omitempty"`
	QuestionID  string   `json:"questionId,omitempty"`
	SelectedIDs []string `json:"selectedIds,omitempty"`
}

// --- Outbound message structs ---

type ConnectedMsg struct {
	Type string `json:"type"`
	UID  string `json:"uid"`
}

type RoomCreatedMsg struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
	Code   string `json:"code"`
}

type PlayerInfo struct {
	UID   string `json:"uid"`
	Name  string `json:"name"`
	Score int    `json:"score"`
	Ready bool   `json:"ready"`
}

type PlayerJoinedMsg struct {
	Type    string       `json:"type"`
	RoomID  string       `json:"roomId"`
	Code    string       `json:"code"`
	Players []PlayerInfo `json:"players"`
}

type GameStartMsg struct {
	Type      string `json:"type"`
	Countdown int    `json:"countdown"`
}

type QuestionMsg struct {
	Type      string `json:"type"`
	ID        string `json:"id"`
	Index     int    `json:"index"`
	Total     int    `json:"total"`
	StartedAt int64  `json:"startedAt"` // Unix ms — clients compute countdown from this
}

type AnswerAckMsg struct {
	Type       string `json:"type"`
	Accepted   bool   `json:"accepted"`
	QuestionID string `json:"questionId"`
}

type OpponentAnsweredMsg struct {
	Type string `json:"type"`
}

type PlayerResult struct {
	SelectedIDs []string `json:"selectedIds"`
	IsCorrect   bool     `json:"isCorrect"`
	Score       int      `json:"score"`
	TimeMs      int64    `json:"timeMs"`
}

type RevealMsg struct {
	Type    string                  `json:"type"`
	Results map[string]PlayerResult `json:"results"` // uid → result
	Scores  []ScoreEntry            `json:"scores"`  // running totals after this round
}

type ScoreEntry struct {
	UID   string `json:"uid"`
	Name  string `json:"name"`
	Score int    `json:"score"`
}

type GameEndMsg struct {
	Type        string       `json:"type"`
	Winner      string       `json:"winner"` // uid of winner, "" if draw
	FinalScores []ScoreEntry `json:"finalScores"`
}

type OpponentDisconnectedMsg struct {
	Type           string `json:"type"`
	GracePeriodSec int    `json:"gracePeriodSec"`
}

type OpponentReconnectedMsg struct {
	Type string `json:"type"`
}

// ReconnectAckMsg is sent to a player who successfully reconnects mid-game.
// It gives them enough state to re-render the current question and scores.
type ReconnectAckMsg struct {
	Type       string       `json:"type"`
	QuestionID string       `json:"questionId"`
	Index      int          `json:"index"`
	Total      int          `json:"total"`
	StartedAt  int64        `json:"startedAt"`
	Scores     []ScoreEntry `json:"scores"`
}

type ErrorMsg struct {
	Type    string `json:"type"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

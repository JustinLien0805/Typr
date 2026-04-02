package game

import (
	"encoding/json"
	"log"
	"math/rand"
	"time"

	"typr/backend/internal/protocol"
	"typr/backend/internal/room"
	"typr/backend/internal/ws"
)

const (
	questionDuration = 15*time.Second + 500*time.Millisecond
	revealPause      = 3 * time.Second
	countdownDelay   = 3500 * time.Millisecond
	gracePeriod      = 30 * time.Second
)

// answerKey maps questionID → set of correct option IDs.
// Mirrored from src/data/questionsData.ts — keep in sync when adding questions.
var answerKey = map[string]map[string]struct{}{
	"q_8":  setOf("opt1"),                         // Serif
	"q_7":  setOf("3"),                            // Script
	"q_10": setOf("opt2"),                         // real Futura
	"q_12": setOf("opt1", "opt2", "opt3", "opt6"), // monospace fonts (multi-select)
	"q_5":  setOf("yellow"),                       // x-height
	"q_4":  setOf("yellow"),                       // terminal
}

// multiplayerPool is the eligible question set for multiplayer.
var multiplayerPool = []string{"q_8", "q_7", "q_10", "q_12", "q_5", "q_4"}

// Run is the main game-loop goroutine for one room.
// Launched when both players set ready; cleans up the room on exit.
func Run(rm *room.Room, hub *ws.Hub, manager *room.Manager) {
	defer func() {
		manager.Delete(rm.ID)
		log.Printf("[game] room %s removed", rm.ID)
	}()

	rm.Status = room.StatusPlaying
	time.Sleep(countdownDelay)

	questionIDs := shuffled(multiplayerPool)
	scores := map[string]int{}
	for _, p := range rm.GetPlayers() {
		scores[p.UID] = 0
	}

	runQuestions(rm, hub, manager, questionIDs, 0, scores)
}

// Resume restores a game from Redis state and continues from startIndex.
// Called when players reconnect after a server restart.
func Resume(rm *room.Room, hub *ws.Hub, manager *room.Manager, questionIDs []string, startIndex int, scores map[string]int) {
	defer func() {
		manager.Delete(rm.ID)
		log.Printf("[game] room %s removed", rm.ID)
	}()

	rm.Status = room.StatusPlaying
	for _, p := range rm.GetPlayers() {
		if _, ok := scores[p.UID]; !ok {
			scores[p.UID] = 0
		}
	}

	runQuestions(rm, hub, manager, questionIDs, startIndex, scores)
}

func runQuestions(rm *room.Room, hub *ws.Hub, manager *room.Manager, questionIDs []string, startIndex int, scores map[string]int) {
	total := len(questionIDs)

	for index := startIndex; index < len(questionIDs); index++ {
		qID := questionIDs[index]
		drainAnswerChan(rm)

		startedAt := time.Now().UnixMilli()
		rm.SetCurrentQuestion(qID, startedAt)
		manager.PersistQuestion(rm.ID, questionIDs, index, qID, startedAt)

		broadcast(hub, rm, protocol.QuestionMsg{
			Type:      protocol.TypeQuestion,
			ID:        qID,
			Index:     index,
			Total:     total,
			StartedAt: startedAt,
		})
		log.Printf("[game] room %s q%d/%d %s", rm.ID, index+1, total, qID)

		qctx := questionCtx{
			id:        qID,
			index:     index,
			total:     total,
			startedAt: startedAt,
			scores:    scores,
		}
		answers, forfeitUID := collectAnswers(rm, hub, qctx)

		if forfeitUID != "" {
			winner := ""
			if forfeitUID != "both" {
				winner = rm.OpponentUID(forfeitUID)
				log.Printf("[game] room %s forfeit by %s, winner %s", rm.ID, forfeitUID, winner)
			} else {
				log.Printf("[game] room %s both players disconnected", rm.ID)
			}
			broadcast(hub, rm, protocol.GameEndMsg{
				Type:        protocol.TypeGameEnd,
				Winner:      winner,
				FinalScores: scoreEntries(rm, scores),
			})
			rm.Status = room.StatusFinished
			return
		}

		results := map[string]protocol.PlayerResult{}
		for _, p := range rm.GetPlayers() {
			ev, answered := answers[p.UID]
			if !answered {
				results[p.UID] = protocol.PlayerResult{
					SelectedIDs: []string{},
					IsCorrect:   false,
					Score:       0,
					TimeMs:      int64(questionDuration.Milliseconds()),
				}
				continue
			}
			isCorrect := checkAnswer(qID, ev.SelectedIDs)
			elapsed := ev.ReceivedAt - startedAt
			pts := 0
			if isCorrect {
				pts = max(1000-int(elapsed/15), 100)
			}
			scores[p.UID] += pts
			results[p.UID] = protocol.PlayerResult{
				SelectedIDs: ev.SelectedIDs,
				IsCorrect:   isCorrect,
				Score:       pts,
				TimeMs:      elapsed,
			}
		}

		manager.PersistScores(rm.ID, scores)

		broadcast(hub, rm, protocol.RevealMsg{
			Type:    protocol.TypeReveal,
			Results: results,
			Scores:  scoreEntries(rm, scores),
		})
		time.Sleep(revealPause)
	}

	winner, finalScores := buildGameEnd(rm, scores)
	broadcast(hub, rm, protocol.GameEndMsg{
		Type:        protocol.TypeGameEnd,
		Winner:      winner,
		FinalScores: finalScores,
	})
	rm.Status = room.StatusFinished
}

type questionCtx struct {
	id        string
	index     int
	total     int
	startedAt int64
	scores    map[string]int
}

func collectAnswers(rm *room.Room, hub *ws.Hub, ctx questionCtx) (map[string]room.AnswerEvent, string) {
	players := rm.GetPlayers()
	answers := make(map[string]room.AnswerEvent, 2)

	questionTimer := time.NewTimer(questionDuration)
	defer questionTimer.Stop()

	var graceExpiry <-chan time.Time
	var graceTimer *time.Timer
	var gracedUID string

	for {
		select {

		case ev := <-rm.AnswerChan:
			if ev.QuestionID != ctx.id {
				continue
			}
			if _, already := answers[ev.UID]; already {
				continue
			}
			if ev.ReceivedAt-ctx.startedAt > int64(questionDuration.Milliseconds()) {
				continue
			}

			answers[ev.UID] = ev
			if opUID := rm.OpponentUID(ev.UID); opUID != "" {
				send(hub, opUID, protocol.OpponentAnsweredMsg{Type: protocol.TypeOpponentAnswered})
			}
			if len(answers) >= len(players) {
				return answers, ""
			}

		case uid := <-rm.DisconnectChan:
			rm.SetConnected(uid, false)
			opUID := rm.OpponentUID(uid)

			if opUID != "" && !rm.IsConnected(opUID) {
				return answers, "both"
			}

			if graceTimer != nil {
				graceTimer.Stop()
			}
			graceTimer = time.NewTimer(gracePeriod)
			graceExpiry = graceTimer.C
			gracedUID = uid

			if opUID != "" {
				send(hub, opUID, protocol.OpponentDisconnectedMsg{
					Type:           protocol.TypeOpponentDisconnected,
					GracePeriodSec: int(gracePeriod.Seconds()),
				})
			}
			log.Printf("[game] room %s player %s disconnected, grace %s", rm.ID, uid, gracePeriod)

		case uid := <-rm.ReconnectChan:
			// Cancel grace period if this was the graced player.
			if uid == gracedUID {
				if graceTimer != nil {
					graceTimer.Stop()
					graceTimer = nil
				}
				graceExpiry = nil
				gracedUID = ""
			}
			rm.SetConnected(uid, true)

			// Always send reconnect_ack — handles both normal grace-period
			// reconnects and server-restart reconnects (gracedUID == "").
			send(hub, uid, protocol.ReconnectAckMsg{
				Type:       protocol.TypeReconnectAck,
				QuestionID: ctx.id,
				Index:      ctx.index,
				Total:      ctx.total,
				StartedAt:  ctx.startedAt,
				Scores:     currentScoreEntries(rm, ctx.scores),
			})

			if opUID := rm.OpponentUID(uid); opUID != "" {
				send(hub, opUID, protocol.OpponentReconnectedMsg{Type: protocol.TypeOpponentReconnected})
			}
			log.Printf("[game] room %s player %s reconnected", rm.ID, uid)

		case <-graceExpiry:
			log.Printf("[game] room %s grace expired for %s", rm.ID, gracedUID)
			return answers, gracedUID

		case <-questionTimer.C:
			return answers, ""
		}
	}
}

func checkAnswer(questionID string, selectedIDs []string) bool {
	correct, ok := answerKey[questionID]
	if !ok || len(selectedIDs) != len(correct) {
		return false
	}
	for _, id := range selectedIDs {
		if _, ok := correct[id]; !ok {
			return false
		}
	}
	return true
}

func buildGameEnd(rm *room.Room, scores map[string]int) (winner string, finalScores []protocol.ScoreEntry) {
	maxScore := -1
	for uid, score := range scores {
		if score > maxScore {
			maxScore = score
			winner = uid
		}
	}
	tieCount := 0
	for _, score := range scores {
		if score == maxScore {
			tieCount++
		}
	}
	if tieCount > 1 {
		winner = ""
	}
	finalScores = scoreEntries(rm, scores)
	return
}

func scoreEntries(rm *room.Room, scores map[string]int) []protocol.ScoreEntry {
	players := rm.GetPlayers()
	entries := make([]protocol.ScoreEntry, len(players))
	for i, p := range players {
		entries[i] = protocol.ScoreEntry{UID: p.UID, Name: p.Name, Score: scores[p.UID]}
	}
	return entries
}

func currentScoreEntries(rm *room.Room, scores map[string]int) []protocol.ScoreEntry {
	return scoreEntries(rm, scores)
}

func broadcast(hub *ws.Hub, rm *room.Room, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		log.Printf("[game] marshal error: %v", err)
		return
	}
	for _, p := range rm.GetPlayers() {
		hub.Send(p.UID, data)
	}
}

func send(hub *ws.Hub, uid string, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	hub.Send(uid, data)
}

func drainAnswerChan(rm *room.Room) {
	for {
		select {
		case <-rm.AnswerChan:
		default:
			return
		}
	}
}

func shuffled(ids []string) []string {
	out := make([]string, len(ids))
	copy(out, ids)
	rand.Shuffle(len(out), func(i, j int) { out[i], out[j] = out[j], out[i] })
	return out
}

func setOf(keys ...string) map[string]struct{} {
	m := make(map[string]struct{}, len(keys))
	for _, k := range keys {
		m[k] = struct{}{}
	}
	return m
}

import { useEffect, useReducer, useRef, useCallback } from "react";

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PlayerInfo {
  uid: string;
  name: string;
  score: number;
  ready: boolean;
}

export interface ScoreEntry {
  uid: string;
  name: string;
  score: number;
}

export interface RevealResult {
  selectedIds: string[];
  isCorrect: boolean;
  score: number;
  timeMs: number;
}

export interface ActiveQuestion {
  id: string;
  index: number;
  total: number;
  startedAt: number; // Unix ms — client computes remaining time from this
}

export interface RoundRecord {
  questionId: string;
  index: number;
  results: Record<string, RevealResult>; // uid → result
}

// ── State ─────────────────────────────────────────────────────────────────────

export interface MPState {
  connected: boolean;
  myUid: string | null;
  phase: "idle" | "lobby" | "playing" | "finished";
  error: string | null;

  // lobby
  roomId: string | null;
  code: string | null;
  players: PlayerInfo[];
  countdown: boolean;

  // playing
  question: ActiveQuestion | null;
  hasAnswered: boolean;
  opponentAnswered: boolean;
  reveal: Record<string, RevealResult> | null;
  scores: ScoreEntry[];

  // overlay — shown on top of the playing phase
  opponentDisconnected: boolean;
  gracePeriodSec: number;

  // finished
  winner: string | null;
  finalScores: ScoreEntry[];

  // accumulated per-round history for the results screen
  roundHistory: RoundRecord[];
}

const initial: MPState = {
  connected: false,
  myUid: null,
  phase: "idle",
  error: null,
  roomId: null,
  code: null,
  players: [],
  countdown: false,
  question: null,
  hasAnswered: false,
  opponentAnswered: false,
  reveal: null,
  scores: [],
  opponentDisconnected: false,
  gracePeriodSec: 0,
  winner: null,
  finalScores: [],
  roundHistory: [],
};

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "WS_OPEN" }
  | { type: "WS_CLOSE" }
  | { type: "connected"; uid: string }
  | { type: "room_created"; roomId: string; code: string }
  | { type: "player_joined"; roomId: string; code: string; players: PlayerInfo[] }
  | { type: "game_start" }
  | { type: "question"; id: string; index: number; total: number; startedAt: number }
  | { type: "answer_ack"; accepted: boolean }
  | { type: "opponent_answered" }
  | { type: "reveal"; results: Record<string, RevealResult>; scores: ScoreEntry[] }
  | { type: "game_end"; winner: string; finalScores: ScoreEntry[] }
  | { type: "opponent_disconnected"; gracePeriodSec: number }
  | { type: "opponent_reconnected" }
  | { type: "reconnect_ack"; questionId: string; index: number; total: number; startedAt: number; scores: ScoreEntry[] }
  | { type: "error"; code: string; message: string };

function reducer(state: MPState, action: Action): MPState {
  switch (action.type) {
    case "WS_OPEN":
      return { ...state, connected: true, error: null };

    case "WS_CLOSE":
      return { ...state, connected: false };

    case "connected":
      sessionStorage.setItem("typr_mp_uid", action.uid);
      return { ...state, myUid: action.uid };

    case "room_created":
      sessionStorage.setItem("typr_mp_room", action.roomId);
      return { ...state, phase: "lobby", roomId: action.roomId, code: action.code };

    case "player_joined":
      sessionStorage.setItem("typr_mp_room", action.roomId);
      return {
        ...state,
        phase: "lobby",
        roomId: action.roomId,
        code: action.code,
        players: action.players,
      };

    case "game_start":
      return { ...state, countdown: true };

    case "question":
      return {
        ...state,
        phase: "playing",
        countdown: false,
        question: { id: action.id, index: action.index, total: action.total, startedAt: action.startedAt },
        hasAnswered: false,
        opponentAnswered: false,
        reveal: null,
      };

    case "answer_ack":
      return action.accepted ? { ...state, hasAnswered: true } : state;

    case "opponent_answered":
      return { ...state, opponentAnswered: true };

    case "reveal": {
      const record: RoundRecord = {
        questionId: state.question?.id ?? "",
        index: state.question?.index ?? 0,
        results: action.results,
      };
      return {
        ...state,
        reveal: action.results,
        scores: action.scores ?? state.scores,
        roundHistory: [...state.roundHistory, record],
      };
    }

    case "game_end":
      sessionStorage.removeItem("typr_mp_room");
      return { ...state, phase: "finished", winner: action.winner, finalScores: action.finalScores };

    case "opponent_disconnected":
      return { ...state, opponentDisconnected: true, gracePeriodSec: action.gracePeriodSec };

    case "opponent_reconnected":
      return { ...state, opponentDisconnected: false, gracePeriodSec: 0 };

    case "reconnect_ack":
      return {
        ...state,
        phase: "playing",
        countdown: false,
        question: { id: action.questionId, index: action.index, total: action.total, startedAt: action.startedAt },
        scores: action.scores,
        hasAnswered: false,
        opponentAnswered: false,
        reveal: null,
      };

    case "error":
      return { ...state, error: action.message };

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMultiplayerSocket() {
  const [state, dispatch] = useReducer(reducer, initial);
  const ws = useRef<WebSocket | null>(null);
  const reconnecting = useRef(false);

  const send = useCallback((msg: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    ws.current = socket;

    socket.onopen = () => {
      dispatch({ type: "WS_OPEN" });
    };

    socket.onclose = () => {
      dispatch({ type: "WS_CLOSE" });
    };

    socket.onmessage = (e) => {
      let msg: Action;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }

      // After identifying ourselves, attempt reconnect if we have a stored room.
      if (msg.type === "connected") {
        dispatch(msg);
        const storedRoom = sessionStorage.getItem("typr_mp_room");
        const storedUID = sessionStorage.getItem("typr_mp_uid");
        // The server just assigned us a new temp UID (msg.uid).
        // If we have a previous identity, send reconnect immediately.
        if (storedRoom && storedUID && storedUID !== msg.uid) {
          reconnecting.current = true;
          socket.send(
            JSON.stringify({ type: "reconnect", roomId: storedRoom, uid: storedUID })
          );
        }
        return;
      }

      // If a reconnect attempt fails, silently clear stale storage instead of
      // showing an error — the room simply no longer exists on the server.
      if (msg.type === "error" && reconnecting.current) {
        reconnecting.current = false;
        sessionStorage.removeItem("typr_mp_room");
        sessionStorage.removeItem("typr_mp_uid");
        return;
      }

      if (msg.type === "reconnect_ack") {
        reconnecting.current = false;
      }

      dispatch(msg as Action);
    };

    return () => {
      socket.close();
    };
  }, []);

  // ── Actions ──

  const createRoom = useCallback(
    (playerName: string) => send({ type: "create_room", playerName }),
    [send]
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => send({ type: "join_room", code, playerName }),
    [send]
  );

  const setReady = useCallback(() => send({ type: "set_ready" }), [send]);

  const submitAnswer = useCallback(
    (questionId: string, selectedIds: string[]) =>
      send({ type: "submit_answer", questionId, selectedIds }),
    [send]
  );

  return { state, createRoom, joinRoom, setReady, submitAnswer };
}

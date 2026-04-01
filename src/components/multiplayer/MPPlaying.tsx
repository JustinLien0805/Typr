import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { findQuestionById } from "../../data/questionsData";
import QuizClassification from "../QuizClassification";
import QuizFundamantal from "../QuizFundamantal";
import MPReveal from "./MPReveal";
import type { useMultiplayerSocket } from "../../hooks/useMultiplayerSocket";
import type { AnswerResult } from "../../types/storage";
import { ORANGE, QUESTION_MS } from "./constants";

type MPState = ReturnType<typeof useMultiplayerSocket>["state"];

interface Props {
  state: MPState;
  submitAnswer: (questionId: string, selectedIds: string[]) => void;
}

export default function MPPlaying({ state, submitAnswer }: Props) {
  const { question, myUid, players, scores, hasAnswered, opponentAnswered, reveal, opponentDisconnected, gracePeriodSec } = state;

  const [showReveal, setShowReveal] = useState(false);
  useEffect(() => {
    if (!reveal) { setShowReveal(false); return; }
    if (!hasAnswered) { setShowReveal(true); return; }
    const t = setTimeout(() => setShowReveal(true), 1500);
    return () => clearTimeout(t);
  }, [reveal, hasAnswered]);

  const handleAnswer = useCallback(
    (result: AnswerResult) => {
      submitAnswer(result.questionId, result.selectedOptionIds);
    },
    [submitAnswer]
  );

  if (!question) return null;

  const found = findQuestionById(question.id);
  const opponent = players.find((p) => p.uid !== myUid);
  const myScore = scores.find((s) => s.uid === myUid)?.score ?? 0;
  const oppScore = scores.find((s) => s.uid !== myUid)?.score ?? 0;

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* opponent disconnect overlay */}
      <AnimatePresence>
        {opponentDisconnected && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <p className="text-lg font-light mb-2">Opponent disconnected</p>
              <p className="text-sm text-gray-500">
                Waiting <span style={{ color: ORANGE }}>{gracePeriodSec}s</span> for them to return…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
        <span className="text-xs tracking-widest uppercase text-gray-600">
          Q {question.index + 1}/{question.total}
        </span>

        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 text-xs">{opponent?.name ?? "Opponent"}</span>
            <span className="font-mono tabular-nums text-gray-300 w-10 text-right">{oppScore}</span>
          </div>
          <span className="text-gray-700">—</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono tabular-nums w-10" style={{ color: ORANGE }}>{myScore}</span>
            <span className="text-xs" style={{ color: ORANGE }}>You</span>
          </div>
        </div>
      </div>

      {/* timer bar */}
      <TimerBar startedAt={question.startedAt} durationMs={QUESTION_MS} />

      {/* opponent status pill */}
      <div className="flex justify-center py-2 shrink-0">
        <AnimatePresence>
          {opponentAnswered && !showReveal && (
            <motion.div
              className="flex items-center gap-2 px-3 py-1 rounded-full border border-[#86EFAC]/30 bg-[#86EFAC]/5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#86EFAC]" />
              <span className="text-xs text-[#86EFAC] tracking-wide">
                {opponent?.name ?? "Opponent"} answered
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* question or reveal */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {showReveal && reveal ? (
            <MPReveal key="reveal" reveal={reveal} myUid={myUid!} players={players} />
          ) : (
            <motion.div
              key={`q-${question.id}`}
              className="h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {found && found.question.type === "classification" && (
                <QuizClassification config={found.question} onAnswer={handleAnswer} onNext={() => {}} />
              )}
              {found && found.question.type === "fundamantal" && (
                <QuizFundamantal config={found.question} onAnswer={handleAnswer} onNext={() => {}} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* waiting footer */}
      <AnimatePresence>
        {hasAnswered && !showReveal && (
          <motion.div
            className="shrink-0 flex items-center justify-center pb-6 pt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-xs tracking-widest uppercase text-gray-600">Waiting for opponent…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TimerBar({ startedAt, durationMs }: { startedAt: number; durationMs: number }) {
  const [pct, setPct] = useState(100);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = Math.max(0, durationMs - elapsed);
      setPct((remaining / durationMs) * 100);
      if (remaining > 0) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [startedAt, durationMs]);

  const color = pct > 50 ? ORANGE : pct > 25 ? "#facc15" : "#FD9798";

  return (
    <div className="h-0.5 bg-gray-900 shrink-0">
      <div className="h-full transition-none" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

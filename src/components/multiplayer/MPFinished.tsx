import { motion } from "motion/react";
import { findQuestionById } from "../../data/questionsData";
import type { ScoreEntry, RoundRecord } from "../../hooks/useMultiplayerSocket";
import { ORANGE } from "./constants";

interface Props {
  winner: string | null;
  finalScores: ScoreEntry[];
  myUid: string;
  players: { uid: string; name: string }[];
  roundHistory: RoundRecord[];
  onPlayAgain: () => void;
  onHome: () => void;
}

export default function MPFinished({ winner, finalScores, myUid, players, roundHistory, onPlayAgain, onHome }: Props) {
  const iWon = winner === myUid;
  const isDraw = winner === "" || winner === null;
  const headline = isDraw ? "Draw" : iWon ? "You win" : "You lose";
  const headlineColor = iWon ? "#86EFAC" : isDraw ? ORANGE : "#FD9798";

  return (
    <motion.div
      className="flex-1 flex flex-col overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-8 px-6 py-10 max-w-lg mx-auto">

          <div className="text-center">
            <motion.h2
              className="text-5xl font-light mb-2"
              style={{ color: headlineColor }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {headline}
            </motion.h2>
          </div>

          {/* final scoreboard */}
          <div className="w-full flex flex-col gap-2">
            {[...finalScores]
              .sort((a, b) => b.score - a.score)
              .map((entry, i) => (
                <div
                  key={entry.uid}
                  className="flex items-center justify-between border border-gray-600 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{i + 1}</span>
                    <span className="text-sm font-light">
                      {entry.name}
                      {entry.uid === myUid && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </span>
                  </div>
                  <span
                    className="font-mono text-sm tabular-nums"
                    style={{ color: entry.uid === winner ? "#86EFAC" : "white" }}
                  >
                    {entry.score}
                  </span>
                </div>
              ))}
          </div>

          {/* round-by-round breakdown */}
          {roundHistory.length > 0 && (
            <div className="w-full flex flex-col gap-3">
              <p className="text-xs tracking-[0.25em] uppercase text-gray-400">Round breakdown</p>
              {roundHistory.map((round) => (
                <RoundCard key={round.index} round={round} myUid={myUid} players={players} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* sticky footer */}
      <div className="shrink-0 flex flex-col gap-3 px-6 py-5 border-t border-gray-900 max-w-lg mx-auto w-full">
        <motion.button
          className="w-full py-3 rounded font-medium tracking-wide text-black"
          style={{ backgroundColor: ORANGE }}
          whileTap={{ scale: 0.97 }}
          onClick={onPlayAgain}
        >
          Play Again
        </motion.button>
        <button
          className="text-xs text-gray-600 hover:text-gray-400 tracking-widest uppercase transition-colors text-center"
          onClick={onHome}
        >
          Back to menu
        </button>
      </div>
    </motion.div>
  );
}

function RoundCard({ round, myUid, players }: { round: RoundRecord; myUid: string; players: { uid: string; name: string }[] }) {
  const found = findQuestionById(round.questionId);
  if (!found) return null;

  const q = found.question;
  const title = q.title as string;

  const entries = Object.entries(round.results).map(([uid, result]) => {
    const name = uid === myUid ? "You" : (players.find((p) => p.uid === uid)?.name ?? "Opponent");
    const isMe = uid === myUid;
    const selectedLabels = resolveLabels(q, result.selectedIds);
    return { uid, name, isMe, result, selectedLabels };
  });

  entries.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : 0));

  const anyCorrect = entries.some((e) => e.result.isCorrect);

  return (
    <motion.div
      className="border border-gray-700 rounded-xl overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: round.index * 0.05 }}
    >
      <div className="px-4 pt-4 pb-3 border-b border-gray-700">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-gray-300 leading-relaxed flex-1">{title}</p>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">Q{round.index + 1}</span>
        </div>
        {q.mainSubject && (
          <p className="text-sm font-light mt-1" style={{ fontFamily: q.mainSubjectFont }}>
            {q.mainSubject}
          </p>
        )}
        {q.subject && (
          <p className="text-sm font-light mt-1" style={{ fontFamily: q.subjectFont }}>
            {q.subject}
          </p>
        )}
      </div>

      <div className="divide-y divide-gray-700">
        {entries.map(({ uid, name, result, selectedLabels }) => (
          <div key={uid} className="flex items-center justify-between px-4 py-2.5 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base leading-none shrink-0" style={{ color: result.isCorrect ? "#86EFAC" : "#FD9798" }}>
                {result.isCorrect ? "✓" : "✗"}
              </span>
              <span className="text-xs text-gray-200 shrink-0">{name}</span>
              <span className="text-xs text-gray-400 truncate">
                {selectedLabels.length > 0 ? selectedLabels.join(", ") : "—"}
              </span>
            </div>
            <span
              className="text-xs font-mono tabular-nums shrink-0"
              style={{ color: result.isCorrect ? "#86EFAC" : "#6b7280" }}
            >
              +{result.score}
            </span>
          </div>
        ))}
      </div>

      {!anyCorrect && (
        <div className="px-4 py-2 bg-white/[0.03] border-t border-gray-700">
          <span className="text-xs text-gray-400">Correct: {resolveCorrectLabel(q)}</span>
        </div>
      )}
    </motion.div>
  );
}

function resolveLabels(q: any, selectedIds: string[]): string[] {
  if (!q.options || selectedIds.length === 0) return [];
  return selectedIds
    .map((id: string) => {
      const opt = q.options.find((o: any) => o.id === id);
      return opt?.text ?? opt?.color ?? id;
    })
    .filter(Boolean);
}

function resolveCorrectLabel(q: any): string {
  if (!q.options) return "—";
  const correct = q.options.filter((o: any) => o.isCorrect);
  if (correct.length === 0) return "—";
  return correct.map((o: any) => o.text ?? o.color ?? o.id).join(", ");
}

import { motion } from "motion/react";
import type { RevealResult } from "../../hooks/useMultiplayerSocket";

interface Props {
  reveal: Record<string, RevealResult>;
  myUid: string;
  players: { uid: string; name: string }[];
}

export default function MPReveal({ reveal, myUid, players }: Props) {
  const myResult = reveal[myUid];
  const opponentEntry = Object.entries(reveal).find(([uid]) => uid !== myUid);
  const opponentResult = opponentEntry?.[1];
  const opponentName = players.find((p) => p.uid !== myUid)?.name ?? "Opponent";

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-8 h-full px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <p className="text-xs tracking-[0.3em] uppercase text-gray-500">Round result</p>

      <div className="flex gap-6 w-full max-w-sm">
        <ResultCard label="You" result={myResult} />
        <ResultCard label={opponentName} result={opponentResult} />
      </div>

      <p className="text-xs text-gray-700 tracking-widest uppercase">Next question…</p>
    </motion.div>
  );
}

function ResultCard({ label, result }: { label: string; result?: RevealResult }) {
  const correct = result?.isCorrect ?? false;
  const score = result?.score ?? 0;
  const timeS = result ? (result.timeMs / 1000).toFixed(1) : "—";

  return (
    <div
      className="flex-1 flex flex-col items-center gap-3 border rounded-xl py-6 px-4"
      style={{ borderColor: correct ? "#86EFAC33" : "#FD979833" }}
    >
      <span className="text-xs tracking-widest uppercase text-gray-500">{label}</span>
      <span className="text-3xl">{correct ? "✓" : "✗"}</span>
      <span
        className="text-xl font-mono"
        style={{ color: correct ? "#86EFAC" : "#FD9798" }}
      >
        +{score}
      </span>
      <span className="text-xs text-gray-600">{timeS}s</span>
    </div>
  );
}

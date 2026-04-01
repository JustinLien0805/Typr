import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ORANGE } from "./constants";

interface Player {
  uid: string;
  name: string;
  ready: boolean;
}

interface Props {
  code: string;
  players: Player[];
  myUid: string;
  countdown: boolean;
  onReady: () => void;
  onBack: () => void;
}

export default function MPLobby({ code, players, myUid, countdown, onReady, onBack }: Props) {
  const isReady = players.find((p) => p.uid === myUid)?.ready ?? false;
  const [count, setCount] = useState(3);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!countdown) return;
    setCount(3);
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(id); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [countdown]);

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center gap-10 px-6 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* countdown overlay */}
      <AnimatePresence>
        {countdown && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              key={count}
              className="text-8xl font-light"
              style={{ color: ORANGE }}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              {count > 0 ? count : "Go!"}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* room code — click to copy */}
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gray-500 mb-3">
          {copied ? "Copied!" : "Share this code"}
        </p>
        <motion.button
          className="flex gap-2 cursor-pointer"
          onClick={copyCode}
          whileTap={{ scale: 0.97 }}
          title="Click to copy"
        >
          {(code ?? "").split("").map((char, i) => (
            <span
              key={i}
              className="w-10 h-12 flex items-center justify-center border rounded text-xl font-mono tracking-widest transition-colors"
              style={{
                borderColor: copied ? "#86EFAC55" : "#374151",
                color: copied ? "#86EFAC" : ORANGE,
              }}
            >
              {char}
            </span>
          ))}
        </motion.button>
      </div>

      {/* player slots */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {[0, 1].map((slot) => {
          const player = players[slot];
          return (
            <div
              key={slot}
              className="flex items-center justify-between border border-gray-800 rounded-lg px-4 py-3"
            >
              {player ? (
                <>
                  <span className="text-sm font-light">
                    {player.name}
                    {player.uid === myUid && (
                      <span className="ml-2 text-xs text-gray-600">(you)</span>
                    )}
                  </span>
                  <span
                    className="text-xs tracking-wider"
                    style={{ color: player.ready ? "#86EFAC" : "#6b7280" }}
                  >
                    {player.ready ? "Ready" : "Waiting…"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-700">Waiting for player…</span>
              )}
            </div>
          );
        })}
      </div>

      {/* actions */}
      <div className="flex flex-col items-center gap-4 w-full max-w-xs">
        <motion.button
          className="w-full py-3 rounded font-medium tracking-wide transition-all disabled:opacity-30"
          style={
            isReady
              ? { backgroundColor: "transparent", color: "#86EFAC", border: "1px solid #86EFAC" }
              : { backgroundColor: ORANGE, color: "black" }
          }
          whileTap={{ scale: 0.97 }}
          disabled={isReady || players.length < 2}
          onClick={onReady}
        >
          {isReady || players.length < 2 ? "Waiting for opponent…" : "Ready"}
        </motion.button>

        <button
          className="text-xs text-gray-600 hover:text-gray-400 tracking-widest uppercase transition-colors"
          onClick={onBack}
        >
          Leave
        </button>
      </div>
    </motion.div>
  );
}

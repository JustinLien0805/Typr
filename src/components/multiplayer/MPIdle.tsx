import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ORANGE } from "./constants";

interface Props {
  createRoom: (name: string) => void;
  joinRoom: (code: string, name: string) => void;
  error: string | null;
}

export default function MPIdle({ createRoom, joinRoom, error }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [tab, setTab] = useState<"create" | "join">("create");

  const handleCreate = () => { if (name.trim()) createRoom(name.trim()); };
  const handleJoin = () => { if (name.trim() && code.trim()) joinRoom(code.trim().toUpperCase(), name.trim()); };

  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center gap-10 px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center">
        <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: ORANGE }}>
          Competitive Mode
        </p>
        <h1 className="text-4xl font-light tracking-tight">Multiplayer</h1>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        <label className="text-xs tracking-widest uppercase text-gray-500">Your name</label>
        <input
          className="bg-transparent border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? handleCreate() : handleJoin())}
          maxLength={20}
          autoFocus
        />
      </div>

      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            className="px-6 py-2 rounded-md text-sm tracking-wide capitalize transition-colors"
            style={tab === t ? { backgroundColor: ORANGE, color: "black" } : { color: "#9ca3af" }}
            onClick={() => setTab(t)}
          >
            {t === "create" ? "Create Room" : "Join Room"}
          </button>
        ))}
      </div>

      <div className="w-full max-w-xs flex flex-col gap-4">
        <AnimatePresence mode="wait">
          {tab === "join" && (
            <motion.div
              key="join-input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-3 overflow-hidden"
            >
              <label className="text-xs tracking-widest uppercase text-gray-500">Room code</label>
              <input
                className="bg-transparent border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors uppercase tracking-widest text-center text-lg"
                placeholder="ABC123"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                maxLength={6}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          className="w-full py-3 rounded font-medium tracking-wide text-black transition-opacity disabled:opacity-30"
          style={{ backgroundColor: ORANGE }}
          whileTap={{ scale: 0.97 }}
          disabled={!name.trim() || (tab === "join" && code.length < 6)}
          onClick={tab === "create" ? handleCreate : handleJoin}
        >
          {tab === "create" ? "Create Room" : "Join Room"}
        </motion.button>

        {error && <p className="text-center text-sm text-[#FD9798]">{error}</p>}
      </div>
    </motion.div>
  );
}

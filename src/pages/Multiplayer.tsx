import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useMultiplayerSocket } from "../hooks/useMultiplayerSocket";
import MPIdle from "../components/multiplayer/MPIdle";
import MPLobby from "../components/multiplayer/MPLobby";
import MPPlaying from "../components/multiplayer/MPPlaying";
import MPFinished from "../components/multiplayer/MPFinished";

export default function Multiplayer() {
  const navigate = useNavigate();
  const { state, createRoom, joinRoom, setReady, submitAnswer } = useMultiplayerSocket();

  return (
    <div className="w-screen h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      <AnimatePresence mode="wait">
        {!state.connected ? (
          <motion.div
            key="connecting"
            className="flex-1 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-gray-500 tracking-widest uppercase text-sm">Connecting…</p>
          </motion.div>
        ) : state.phase === "idle" ? (
          <MPIdle key="idle" createRoom={createRoom} joinRoom={joinRoom} error={state.error} />
        ) : state.phase === "lobby" ? (
          <MPLobby
            key="lobby"
            code={state.code!}
            players={state.players}
            myUid={state.myUid!}
            countdown={state.countdown}
            onReady={setReady}
            onBack={() => navigate("/select")}
          />
        ) : state.phase === "playing" ? (
          <MPPlaying key="playing" state={state} submitAnswer={submitAnswer} />
        ) : (
          <MPFinished
            key="finished"
            winner={state.winner}
            finalScores={state.finalScores}
            myUid={state.myUid!}
            players={state.players}
            roundHistory={state.roundHistory}
            onPlayAgain={() => navigate("/multiplayer")}
            onHome={() => navigate("/select")}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

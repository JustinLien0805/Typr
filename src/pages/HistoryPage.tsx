import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useStorage } from "../context/StorageContext";
import { computeOverallStats } from "../utils/historyStats";
import { QUIZ_CATEGORIES } from "../data/questionsData";

const CATEGORY_COLORS: Record<string, string> = {
  micro: "#4ADE80",
  classification: "#60A5FA",
  poster: "#FACC15",
  fundamantal: "#C084FC",
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data, clearHistory } = useStorage();
  const stats = useMemo(() => computeOverallStats(data), [data]);
  const sessions = data.quizHistory;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <button
              onClick={() => navigate("/select")}
              className="text-xs uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors mb-4 cursor-pointer"
            >
              ← Back
            </button>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              History
            </h1>
          </div>
          {sessions.length > 0 && (
            <button
              onClick={clearHistory}
              className="text-xs uppercase tracking-wide text-gray-600 hover:text-red-400 transition-colors border border-gray-800 hover:border-red-400 px-3 py-1.5 cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 text-lg">No quiz sessions yet.</p>
            <button
              onClick={() => navigate("/quizz")}
              className="mt-6 px-6 py-3 bg-white text-black font-bold uppercase tracking-wide text-sm hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Start Quizz
            </button>
          </div>
        ) : (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <StatCard label="Sessions" value={stats.totalSessions.toString()} />
              <StatCard
                label="Average"
                value={stats.averageScore.toFixed(1)}
                suffix={`/10`}
              />
              <StatCard label="Best" value={stats.bestScore.toString()} suffix="/10" />
              <StatCard
                label="Avg Time"
                value={formatTime(stats.averageTimeMs)}
              />
            </div>

            {/* Category accuracy */}
            <div className="mb-12">
              <h2 className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-4">
                Category Accuracy
              </h2>
              <div className="space-y-3">
                {stats.categoryAccuracy.map((cat) => {
                  const catInfo = QUIZ_CATEGORIES.find(
                    (c) => c.id === cat.categoryId
                  );
                  const pct =
                    cat.total > 0
                      ? Math.round((cat.correct / cat.total) * 100)
                      : 0;
                  return (
                    <div key={cat.categoryId} className="flex items-center gap-3">
                      <span className="text-xs uppercase tracking-wide text-gray-400 w-28 text-right">
                        {catInfo?.title ?? cat.categoryId}
                      </span>
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor:
                              CATEGORY_COLORS[cat.categoryId] ?? "#888",
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs font-mono text-gray-400 w-12">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session list */}
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-4">
                Recent Sessions
              </h2>
              <div className="space-y-2">
                {[...sessions]
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between py-3 px-4 border border-gray-800 hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black tabular-nums">
                          {session.totalScore}
                          <span className="text-sm text-gray-500 font-light">
                            /{session.totalQuestions}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                        <span>{formatTime(session.totalTimeMs)}</span>
                        <span>{formatDate(session.date)}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="border border-gray-800 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1">
        {label}
      </p>
      <p className="text-2xl font-black tabular-nums">
        {value}
        {suffix && (
          <span className="text-sm text-gray-500 font-light">{suffix}</span>
        )}
      </p>
    </div>
  );
}

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

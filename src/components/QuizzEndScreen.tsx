import { motion } from "motion/react";
import type { SessionQuestionResult, CategoryBreakdown } from "../types/storage";
import { findQuestionById, QUIZ_CATEGORIES } from "../data/questionsData";

interface ReviewImprovementItem {
  questionId: string;
  title: string;
  improved: boolean;
}

interface QuizzEndScreenProps {
  results: SessionQuestionResult[];
  totalQuestions: number;
  totalTimeMs: number;
  isReviewMode?: boolean;
  reviewImprovement?: ReviewImprovementItem[];
  onPlayAgain: () => void;
  onBack: () => void;
}

export default function QuizzEndScreen({
  results,
  totalQuestions,
  totalTimeMs,
  isReviewMode = false,
  reviewImprovement = [],
  onPlayAgain,
  onBack,
}: QuizzEndScreenProps) {
  const score = results.filter((r) => r.isCorrect).length;
  const avgTimeMs = results.length > 0 ? totalTimeMs / results.length : 0;

  // Build per-category breakdown
  const breakdownMap = new Map<string, { correct: number; total: number }>();
  for (const r of results) {
    const entry = breakdownMap.get(r.categoryId) ?? { correct: 0, total: 0 };
    entry.total++;
    if (r.isCorrect) entry.correct++;
    breakdownMap.set(r.categoryId, entry);
  }

  const breakdown: (CategoryBreakdown & { name: string; color: string })[] = [];
  for (const [categoryId, data] of breakdownMap) {
    const cat = QUIZ_CATEGORIES.find((c) => c.id === categoryId);
    breakdown.push({
      categoryId,
      correct: data.correct,
      total: data.total,
      name: cat?.title ?? categoryId,
      color: getCategoryColor(categoryId),
    });
  }

  const improvedItems = reviewImprovement.filter((item) => item.improved);
  const stillUnstableItems = reviewImprovement.filter((item) => !item.improved);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <p className="text-sm uppercase tracking-[0.3em] text-gray-500 mb-2">
            Final Score
          </p>
          <p className="text-8xl font-black tabular-nums">
            {score}
            <span className="text-3xl text-gray-500 font-light">
              /{totalQuestions}
            </span>
          </p>
        </motion.div>

        {/* Time */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-gray-500 mt-4 font-mono"
        >
          {formatTime(totalTimeMs)} total · {formatTime(avgTimeMs)} avg/question
        </motion.p>

        {/* Category breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 w-full max-w-sm mx-auto space-y-3"
        >
          {breakdown.map((cat) => (
            <div key={cat.categoryId} className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wide text-gray-400 w-28 text-right">
                {cat.name}
              </span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: cat.color }}
                  initial={{ width: 0 }}
                  animate={{
                    width: `${cat.total > 0 ? (cat.correct / cat.total) * 100 : 0}%`,
                  }}
                  transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span className="text-xs font-mono text-gray-400 w-8">
                {cat.correct}/{cat.total}
              </span>
            </div>
          ))}
        </motion.div>

        {isReviewMode && reviewImprovement.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="mt-10 w-full max-w-xl mx-auto rounded-3xl border border-white/10 bg-white/5 p-6 text-left"
          >
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
              Improvement Summary
            </p>
            <p className="mt-3 text-sm text-white/80">
              {improvedItems.length > 0
                ? `You improved ${improvedItems.length} of ${reviewImprovement.length} review item${reviewImprovement.length === 1 ? "" : "s"}.`
                : `You didn't stabilize any of these review items yet.`}
            </p>

            {improvedItems.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-300/80">
                  Improved
                </p>
                <div className="mt-3 space-y-2">
                  {improvedItems.map((item) => (
                    <ReviewLine key={item.questionId} title={item.title} tone="improved" />
                  ))}
                </div>
              </div>
            )}

            {stillUnstableItems.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.22em] text-rose-300/80">
                  Still Needs Review
                </p>
                <div className="mt-3 space-y-2">
                  {stillUnstableItems.map((item) => (
                    <ReviewLine key={item.questionId} title={item.title} tone="unstable" />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 flex gap-4 justify-center"
        >
          <button
            onClick={onPlayAgain}
            className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wide text-sm hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Play Again
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-600 text-gray-400 uppercase tracking-wide text-sm hover:border-white hover:text-white transition-colors cursor-pointer"
          >
            Back
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function ReviewLine({ title, tone }: { title: string; tone: "improved" | "unstable" }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-black/30 px-4 py-3">
      <span
        className="mt-0.5 text-sm"
        style={{ color: tone === "improved" ? "#86EFAC" : "#FD9798" }}
      >
        {tone === "improved" ? "✓" : "•"}
      </span>
      <span className="text-sm text-white/82">{title}</span>
    </div>
  );
}

export function buildReviewImprovement(
  reviewQuestionIds: string[],
  initialQuestionCorrectness: Record<string, boolean>,
  results: SessionQuestionResult[]
): ReviewImprovementItem[] {
  const latestResults = new Map<string, SessionQuestionResult>();
  for (const result of results) {
    latestResults.set(result.questionId, result);
  }

  return reviewQuestionIds
    .map((questionId) => {
      const found = findQuestionById(questionId);
      const latest = latestResults.get(questionId);
      const wasCorrect = initialQuestionCorrectness[questionId] ?? false;

      if (!latest || wasCorrect) {
        return null;
      }

      return {
        questionId,
        title: found?.question.title ?? questionId,
        improved: latest.isCorrect,
      };
    })
    .filter((item): item is ReviewImprovementItem => item !== null);
}

function formatTime(ms: number): string {
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function getCategoryColor(id: string): string {
  const colors: Record<string, string> = {
    micro: "#4ADE80",
    classification: "#60A5FA",
    poster: "#FACC15",
    fundamantal: "#C084FC",
  };
  return colors[id] ?? "#888";
}

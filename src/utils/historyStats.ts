import type { StorageSchema } from "../types/storage";

export interface OverallStats {
  totalSessions: number;
  averageScore: number;
  bestScore: number;
  averageTimeMs: number;
  categoryAccuracy: { categoryId: string; correct: number; total: number }[];
}

export function computeOverallStats(data: StorageSchema): OverallStats {
  const sessions = data.quizHistory;

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      bestScore: 0,
      averageTimeMs: 0,
      categoryAccuracy: [],
    };
  }

  const totalScore = sessions.reduce((s, r) => s + r.totalScore, 0);
  const bestScore = Math.max(...sessions.map((r) => r.totalScore));
  const totalTimeMs = sessions.reduce((s, r) => s + r.totalTimeMs, 0);

  // Aggregate per-category across all sessions
  const catMap = new Map<string, { correct: number; total: number }>();
  for (const session of sessions) {
    for (const cb of session.categoryBreakdown) {
      const entry = catMap.get(cb.categoryId) ?? { correct: 0, total: 0 };
      entry.correct += cb.correct;
      entry.total += cb.total;
      catMap.set(cb.categoryId, entry);
    }
  }

  const categoryAccuracy = Array.from(catMap.entries()).map(
    ([categoryId, data]) => ({
      categoryId,
      ...data,
    })
  );

  return {
    totalSessions: sessions.length,
    averageScore: totalScore / sessions.length,
    bestScore,
    averageTimeMs: totalTimeMs / sessions.length,
    categoryAccuracy,
  };
}

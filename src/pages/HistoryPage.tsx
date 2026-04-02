import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { useStorage } from "../context/StorageContext";
import { QUIZ_CATEGORIES } from "../data/questionsData";
import type { QuizSessionRecord } from "../types/storage";
import { computeOverallStats } from "../utils/historyStats";

const CATEGORY_COLORS: Record<string, string> = {
  micro: "#4ADE80",
  classification: "#60A5FA",
  poster: "#FACC15",
  fundamantal: "#C084FC",
};

const MAX_VISIBLE_SESSIONS = 12;
const MAX_VISIBLE_WEAK_AREAS = 5;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "");

interface RemoteHistoryPayload {
  sessions: Array<{
    id: string;
    date: string;
    totalScore: number;
    totalQuestions: number;
    totalTimeMs: number;
  }>;
}

interface WeakArea {
  questionId: string;
  categoryId: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number;
  lastAttemptAt: string;
  lastCorrect: boolean;
  avgResponseTimeMs: number;
}

interface WeakAreasPayload {
  weakAreas: WeakArea[];
}

interface CategoryAccuracyItem {
  categoryId: string;
  correct: number;
  total: number;
}

interface CategoryAccuracyPayload {
  categories: CategoryAccuracyItem[];
}

export default function HistoryPage() {
  const navigate = useNavigate();
  const { data, clearHistory } = useStorage();
  const { profile, getIdToken } = useAuth();
  const [remoteSessions, setRemoteSessions] = useState<QuizSessionRecord[] | null>(null);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [weakAreas, setWeakAreas] = useState<WeakArea[]>([]);
  const [loadingWeakAreas, setLoadingWeakAreas] = useState(false);
  const [weakAreasError, setWeakAreasError] = useState<string | null>(null);
  const [remoteCategoryAccuracy, setRemoteCategoryAccuracy] = useState<CategoryAccuracyItem[]>([]);
  const [categoryAccuracyError, setCategoryAccuracyError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) {
      setRemoteSessions(null);
      setLoadingRemote(false);
      setRemoteError(null);
      setWeakAreas([]);
      setLoadingWeakAreas(false);
      setWeakAreasError(null);
      setRemoteCategoryAccuracy([]);
      setCategoryAccuracyError(null);
      return;
    }

    let cancelled = false;

    const loadCloudData = async () => {
      setLoadingRemote(true);
      setLoadingWeakAreas(true);
      setRemoteError(null);
      setWeakAreasError(null);

      try {
        const idToken = await getIdToken();
        if (!idToken) {
          throw new Error("Missing authentication token");
        }

        const [historyResponse, weakAreasResponse, categoryAccuracyResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/api/me/history`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/api/me/weak-areas`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }),
          fetch(`${apiBaseUrl}/api/me/category-accuracy`, {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }),
        ]);

        if (!historyResponse.ok) {
          throw new Error("Failed to load cloud history");
        }

        const historyPayload = (await historyResponse.json()) as RemoteHistoryPayload;
        const weakAreasPayload = weakAreasResponse.ok
          ? ((await weakAreasResponse.json()) as WeakAreasPayload)
          : { weakAreas: [] };
        const categoryAccuracyPayload = categoryAccuracyResponse.ok
          ? ((await categoryAccuracyResponse.json()) as CategoryAccuracyPayload)
          : { categories: [] };

        if (cancelled) return;

        setRemoteSessions(
          historyPayload.sessions.map((session) => ({
            ...session,
            categoryBreakdown: [],
            questions: [],
          }))
        );
        setWeakAreas(weakAreasPayload.weakAreas.slice(0, MAX_VISIBLE_WEAK_AREAS));
        setRemoteCategoryAccuracy(categoryAccuracyPayload.categories);

        if (!weakAreasResponse.ok) {
          setWeakAreasError("Weak area analysis is unavailable right now");
        }
        if (!categoryAccuracyResponse.ok) {
          setCategoryAccuracyError("Category analysis is unavailable right now");
        }
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Failed to load cloud history";
        setRemoteError(message);
        setRemoteSessions([]);
      } finally {
        if (!cancelled) {
          setLoadingRemote(false);
          setLoadingWeakAreas(false);
        }
      }
    };

    void loadCloudData();

    return () => {
      cancelled = true;
    };
  }, [getIdToken, profile]);

  const sessions = useMemo(() => {
    if (profile) {
      return remoteSessions ?? [];
    }
    return data.quizHistory;
  }, [data.quizHistory, profile, remoteSessions]);

  const historyData = useMemo(
    () => ({
      ...data,
      quizHistory: sessions,
    }),
    [data, sessions]
  );

  const stats = useMemo(() => computeOverallStats(historyData), [historyData]);
  const categoryAccuracy = useMemo(() => {
    if (profile) {
      return remoteCategoryAccuracy;
    }
    return stats.categoryAccuracy;
  }, [profile, remoteCategoryAccuracy, stats.categoryAccuracy]);
  const visibleSessions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_VISIBLE_SESSIONS),
    [sessions]
  );

  const cloudReady = !profile || (!loadingRemote && !loadingWeakAreas);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-8 md:px-12 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-start justify-between gap-6 border-b border-white/10 pb-8">
          <div className="max-w-2xl">
            <button
              onClick={() => navigate("/select")}
              className="mb-4 cursor-pointer text-xs uppercase tracking-[0.24em] text-white/45 transition-colors hover:text-white"
            >
              ← Back
            </button>
            <p className="mb-3 text-[10px] uppercase tracking-[0.38em] text-cyan-300/80">
              Learning Log
            </p>
            <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
              History
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
              Review your recent sessions, spot unstable questions, and use the
              patterns here to decide what to revisit next.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            {profile ? (
              <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-cyan-200">
                Cloud synced
              </div>
            ) : (
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-white/55">
                Local only
              </div>
            )}

            {!profile && sessions.length > 0 && (
              <button
                onClick={clearHistory}
                className="cursor-pointer border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-white/55 transition-colors hover:border-rose-400 hover:text-rose-300"
              >
                Clear All
              </button>
            )}
          </div>
        </div>

        {profile && !cloudReady ? (
          <LoadingState />
        ) : sessions.length === 0 ? (
          <EmptyState
            loading={loadingRemote}
            remoteError={remoteError}
            onStart={() => navigate("/quizz")}
          />
        ) : (
          <>
            <div className="mb-8 grid gap-4 md:grid-cols-4">
              <HeroStat
                label="Sessions"
                value={stats.totalSessions.toString()}
                hint="Total completed runs"
              />
              <HeroStat
                label="Average"
                value={stats.averageScore.toFixed(1)}
                suffix={`/10`}
                hint="Across visible history"
              />
              <HeroStat
                label="Best"
                value={stats.bestScore.toString()}
                suffix="/10"
                hint="Highest score so far"
              />
              <HeroStat
                label="Avg Time"
                value={formatTime(stats.averageTimeMs)}
                hint="Per completed run"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
              <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                <SectionHeader
                  eyebrow="Focus"
                  title="Weak Areas"
                  description="Questions that are costing you the most consistency right now."
                />

                {profile && weakAreas.length > 0 && (
                  <div className="mb-5 flex justify-end">
                    <button
                      onClick={() =>
                        navigate(
                          `/quizz?review=${encodeURIComponent(
                            weakAreas.map((area) => area.questionId).join(",")
                          )}`
                        )
                      }
                      className="cursor-pointer rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-300/15"
                    >
                      Practice These {weakAreas.length}
                    </button>
                  </div>
                )}

                {profile ? (
                  weakAreas.length > 0 ? (
                    <div className="space-y-3">
                      {weakAreas.map((area, index) => (
                        <WeakAreaCard key={area.questionId} area={area} index={index} />
                      ))}
                    </div>
                  ) : (
                    <PanelMessage
                      title="No weak areas yet"
                      message={
                        weakAreasError ??
                        "Keep playing a few more rounds and this section will start to highlight unstable questions."
                      }
                    />
                  )
                ) : (
                  <PanelMessage
                    title="Sign in for personalized analysis"
                    message="Weak area detection uses your cloud history, so it only appears once your sessions are synced."
                  />
                )}
              </section>

              <div className="space-y-6">
                <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                  <SectionHeader
                    eyebrow="Distribution"
                    title="Category Accuracy"
                    description="A quick view of where your confidence is strongest across the question set."
                  />

                  {categoryAccuracy.length > 0 ? (
                    <div className="space-y-4">
                      {categoryAccuracy.map((cat) => {
                        const catInfo = QUIZ_CATEGORIES.find((c) => c.id === cat.categoryId);
                        const pct =
                          cat.total > 0 ? Math.round((cat.correct / cat.total) * 100) : 0;
                        return (
                          <div key={cat.categoryId} className="space-y-2">
                            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/55">
                              <span>{catInfo?.title ?? cat.categoryId}</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-white/8">
                              <motion.div
                                className="h-full rounded-full"
                                style={{
                                  backgroundColor: CATEGORY_COLORS[cat.categoryId] ?? "#888",
                                }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.55, ease: "easeOut" }}
                              />
                            </div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">
                              {cat.correct} correct out of {cat.total}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <PanelMessage
                      title="Category view unavailable"
                      message={
                        profile
                          ? (categoryAccuracyError ??
                            "Your synced history does not have enough category data yet.")
                          : "Complete a few local sessions to see which categories are strongest."
                      }
                    />
                  )}
                </section>

                <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
                  <SectionHeader
                    eyebrow="Timeline"
                    title="Recent Sessions"
                    description="Your latest runs, sorted from newest to oldest."
                  />

                  {sessions.length > visibleSessions.length && (
                    <p className="mb-4 text-[11px] uppercase tracking-[0.24em] text-white/38">
                      Showing latest {visibleSessions.length} of {sessions.length}
                    </p>
                  )}

                  <div className="space-y-3">
                    {visibleSessions.map((session, index) => (
                      <motion.div
                        key={session.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/35 px-5 py-4 md:flex-row md:items-center md:justify-between"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.03 }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 text-[10px] uppercase tracking-[0.24em] text-white/28">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="text-3xl font-black tabular-nums leading-none">
                              {session.totalScore}
                              <span className="ml-1 text-sm font-light text-white/38">
                                /{session.totalQuestions}
                              </span>
                            </p>
                            <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-white/35">
                              {getSessionLabel(session)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-[11px] uppercase tracking-[0.18em] text-white/42">
                          <span>{formatTime(session.totalTimeMs)}</span>
                          <span>{formatDate(session.date)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            {remoteError && (
              <p className="mt-4 text-sm text-rose-300">{remoteError}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[24px] border border-white/8 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-[28px] border border-white/8 bg-white/[0.04]"
          />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-[28px] border border-white/8 bg-white/[0.04]" />
    </div>
  );
}

function EmptyState({
  loading,
  remoteError,
  onStart,
}: {
  loading: boolean;
  remoteError: string | null;
  onStart: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/12 bg-white/[0.02] px-8 py-20 text-center">
      <p className="text-lg text-white/55">
        {loading ? "Loading history..." : "No quiz sessions yet."}
      </p>
      {remoteError && <p className="mt-3 text-sm text-rose-300">{remoteError}</p>}
      <button
        onClick={onStart}
        className="mt-8 cursor-pointer bg-white px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-colors hover:bg-white/85"
      >
        Start Quizz
      </button>
    </div>
  );
}

function HeroStat({
  label,
  value,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5">
      <p className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/42">
        {label}
      </p>
      <p className="text-3xl font-black tabular-nums leading-none">
        {value}
        {suffix && <span className="ml-1 text-base font-light text-white/38">{suffix}</span>}
      </p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/26">{hint}</p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-black uppercase tracking-tight">{title}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-white/52">{description}</p>
    </div>
  );
}

function WeakAreaCard({ area, index }: { area: WeakArea; index: number }) {
  const categoryTitle =
    QUIZ_CATEGORIES.find((category) => category.id === area.categoryId)?.title ??
    area.categoryId;

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-black/35 p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/32">
            {categoryTitle || "Unknown category"}
          </p>
          <h3 className="mt-2 text-lg font-black uppercase tracking-[0.08em]">
            {area.questionId}
          </h3>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Last seen {formatRelativeDate(area.lastAttemptAt)}
          </p>
        </div>

        <div className="text-left md:text-right">
          <p className="text-3xl font-black tabular-nums leading-none text-rose-300">
            {Math.round(area.accuracy)}%
          </p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/38">
            Accuracy
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-[11px] uppercase tracking-[0.18em] text-white/45 md:grid-cols-4">
        <MetricPill label="Attempts" value={area.attempts.toString()} />
        <MetricPill label="Misses" value={area.incorrectCount.toString()} />
        <MetricPill label="Avg Time" value={formatTime(area.avgResponseTimeMs)} />
        <MetricPill label="Status" value={area.lastCorrect ? "Recovered" : "Unstable"} />
      </div>
    </motion.div>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <p className="text-[10px] tracking-[0.22em] text-white/28">{label}</p>
      <p className="mt-2 text-sm font-semibold tracking-[0.08em] text-white/82">{value}</p>
    </div>
  );
}

function PanelMessage({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">{title}</p>
      <p className="mt-3 max-w-lg text-sm leading-6 text-white/45">{message}</p>
    </div>
  );
}

function getSessionLabel(session: QuizSessionRecord): string {
  if (session.totalQuestions === 0) {
    return "No questions recorded";
  }

  const accuracy = Math.round((session.totalScore / session.totalQuestions) * 100);
  if (accuracy >= 90) return "Excellent retention";
  if (accuracy >= 70) return "Solid performance";
  if (accuracy >= 50) return "Mixed confidence";
  return "Needs review";
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

function formatRelativeDate(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffMs = Date.now() - ts;
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours < 24) return `${Math.max(diffHours, 1)}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
}

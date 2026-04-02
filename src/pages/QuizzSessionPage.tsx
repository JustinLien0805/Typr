import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  QuizSessionProvider,
  useQuizSession,
} from "../context/QuizSessionContext";
import { useAuth } from "../context/AuthContext";
import { useStorage } from "../context/StorageContext";
import { useTimer } from "../hooks/useTimer";
import { selectBalancedQuestions, selectQuestionsByIds } from "../utils/questionSelection";
import QuizTimer from "../components/QuizTimer";
import QuizProgress from "../components/QuizProgress";
import QuizzEndScreen from "../components/QuizzEndScreen";

// Quiz renderers
import UnifiedQuiz from "../components/UnifiedQuiz";
import QuizMicro from "../components/QuizMicro";
import QuizClassification from "../components/QuizClassification";
import QuizFundamantal from "../components/QuizFundamantal";

import type { AnswerResult, QuizSessionRecord, CategoryBreakdown } from "../types/storage";

const TIMER_SECONDS = 15;
const TOTAL_QUESTIONS = 10;

function QuizzSessionInner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { saveQuizSession, updateQuestionBankResult } = useStorage();
  const { profile, getIdToken } = useAuth();
  const {
    state,
    initSession,
    answerQuestion,
    handleTimeout,
    nextQuestion,
    finishSession,
    currentQuestion,
    totalElapsedMs,
  } = useQuizSession();

  const [answered, setAnswered] = useState(false);
  const hasInit = useRef(false);
  const gridSubmitRef = useRef<(() => void) | null>(null);
  const persistedSessionRef = useRef(false);
  const reviewQuestionIds = useMemoizedReviewIds(searchParams.get("review"));
  const isReviewMode = reviewQuestionIds.length > 0;

  // Init session on mount
  useEffect(() => {
    if (hasInit.current) return;
    hasInit.current = true;
    persistedSessionRef.current = false;
    const questions = getSessionQuestions(reviewQuestionIds);
    initSession(questions);
  }, [initSession, reviewQuestionIds]);

  // Timer
  const onTimerExpire = useCallback(() => {
    if (answered) return;
    // If a grid question has registered a submit fn, call it instead of timeout
    if (gridSubmitRef.current) {
      gridSubmitRef.current();
      gridSubmitRef.current = null;
    } else {
      handleTimeout();
    }
    setAnswered(true);
    setTimeout(() => {
      setAnswered(false);
      nextQuestion();
    }, 2000);
  }, [answered, handleTimeout, nextQuestion]);

  const { secondsLeft, reset: resetTimer, pause: pauseTimer } = useTimer(
    TIMER_SECONDS,
    onTimerExpire
  );

  // Reset timer and grid submit ref when question changes
  useEffect(() => {
    if (state.currentIndex > 0 || state.questions.length > 0) {
      resetTimer();
      setAnswered(false);
      gridSubmitRef.current = null;
    }
  }, [state.currentIndex, resetTimer]);

  // Handle answer from quiz component
  const handleAnswer = useCallback(
    (result: AnswerResult) => {
      if (answered) return;
      setAnswered(true);
      pauseTimer();

      const cq = currentQuestion;
      if (!cq) return;

      answerQuestion(
        result.questionId,
        cq.categoryId,
        result.isCorrect,
        result.selectedOptionIds
      );

      // Also update question bank
      updateQuestionBankResult(result.questionId, cq.categoryId, result.isCorrect);
    },
    [answered, pauseTimer, currentQuestion, answerQuestion, updateQuestionBankResult]
  );

  // Handle next (called by quiz component's onNext)
  const handleNext = useCallback(() => {
    setAnswered(false);
    nextQuestion();
  }, [nextQuestion]);

  // Save session when finished
  useEffect(() => {
    if (!state.isFinished || state.results.length === 0) return;
    if (persistedSessionRef.current) return;
    persistedSessionRef.current = true;

    const elapsed = totalElapsedMs();
    const score = state.results.filter((r) => r.isCorrect).length;
    const completedAt = new Date();
    const startedAt = new Date(state.startTimeMs);

    // Build category breakdown
    const catMap = new Map<string, { correct: number; total: number }>();
    for (const r of state.results) {
      const e = catMap.get(r.categoryId) ?? { correct: 0, total: 0 };
      e.total++;
      if (r.isCorrect) e.correct++;
      catMap.set(r.categoryId, e);
    }
    const categoryBreakdown: CategoryBreakdown[] = [];
    for (const [categoryId, data] of catMap) {
      categoryBreakdown.push({ categoryId, ...data });
    }

    const record: QuizSessionRecord = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      totalScore: score,
      totalQuestions: state.results.length,
      totalTimeMs: elapsed,
      categoryBreakdown,
      questions: state.results,
    };

    saveQuizSession(record);

    if (!profile) return;

    const persistRemoteSession = async () => {
      const idToken = await getIdToken();
      if (!idToken) return;

      await fetch(`${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")}/api/learning/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode: "solo",
          startedAt: startedAt.toISOString(),
          completedAt: completedAt.toISOString(),
          totalQuestions: state.results.length,
          correctAnswers: score,
          attempts: state.results.map((result) => ({
            questionId: result.questionId,
            categoryId: result.categoryId,
            answeredAt: result.answeredAt,
            responseTimeMs: result.timeMs,
            isCorrect: result.isCorrect,
            selectedOptionIds: result.selectedOptionIds,
          })),
        }),
      });
    };

    void persistRemoteSession();
  }, [getIdToken, profile, saveQuizSession, state.isFinished, state.results, state.startTimeMs, totalElapsedMs]);

  // End screen
  if (state.isFinished) {
    return (
      <QuizzEndScreen
        results={state.results}
        totalQuestions={state.results.length}
        totalTimeMs={totalElapsedMs()}
        onPlayAgain={() => {
          hasInit.current = false;
          persistedSessionRef.current = false;
          const questions = getSessionQuestions(reviewQuestionIds);
          initSession(questions);
        }}
        onBack={() => navigate("/select")}
      />
    );
  }

  // Loading
  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const { question } = currentQuestion;
  const questionType = question.type ?? "poster";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Top bar: progress + timer */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm border-b border-gray-800/50 px-6 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            <QuizProgress current={state.currentIndex} total={state.questions.length} />
            {isReviewMode && (
              <span className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-cyan-200 md:inline-block">
                Review Mode
              </span>
            )}
          </div>
          <div className="flex-1 max-w-xs">
            <QuizTimer secondsLeft={secondsLeft} totalSeconds={TIMER_SECONDS} />
          </div>
        </div>
      </div>

      {/* Timeout overlay */}
      <AnimatePresence>
        {answered && secondsLeft <= 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <p className="text-3xl font-bold text-red-400 uppercase tracking-wide">
                Time's Up!
              </p>
              <p className="text-sm text-gray-400 mt-2">Moving to next question...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Question content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {questionType === "micro" && (
              <QuizMicro
                config={question}
                onNext={handleNext}
                onAnswer={handleAnswer}
                onRegisterSubmit={(fn) => { gridSubmitRef.current = fn; }}
              />
            )}
            {questionType === "classification" && (
              <QuizClassification
                config={question}
                onNext={handleNext}
                onAnswer={handleAnswer}
                onRegisterSubmit={(fn) => { gridSubmitRef.current = fn; }}
              />
            )}
            {questionType === "fundamantal" && (
              <QuizFundamantal
                config={question}
                onNext={handleNext}
                onAnswer={handleAnswer}
              />
            )}
            {questionType === "poster" && (
              <div className="w-full min-h-screen bg-black">
                <UnifiedQuiz
                  config={question}
                  onNext={handleNext}
                  onAnswer={handleAnswer}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function QuizzSessionPage() {
  return (
    <QuizSessionProvider>
      <QuizzSessionInner />
    </QuizSessionProvider>
  );
}

function useMemoizedReviewIds(reviewParam: string | null) {
  return useState(() => {
    if (!reviewParam) return [];
    return reviewParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  })[0];
}

function getSessionQuestions(reviewQuestionIds: string[]) {
  const reviewQuestions = selectQuestionsByIds(reviewQuestionIds);
  if (reviewQuestions.length > 0) {
    return reviewQuestions;
  }
  return selectBalancedQuestions(TOTAL_QUESTIONS);
}

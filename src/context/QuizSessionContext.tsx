import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { SessionQuestionResult } from "../types/storage";

interface QuizQuestion {
  question: any;
  categoryId: string;
}

interface QuizSessionState {
  questions: QuizQuestion[];
  currentIndex: number;
  results: SessionQuestionResult[];
  isFinished: boolean;
  startTimeMs: number;
  questionStartMs: number;
}

type QuizSessionAction =
  | { type: "INIT"; questions: QuizQuestion[] }
  | {
      type: "ANSWER_QUESTION";
      questionId: string;
      categoryId: string;
      isCorrect: boolean;
      selectedOptionIds: string[];
    }
  | { type: "NEXT_QUESTION" }
  | { type: "TIMEOUT" }
  | { type: "FINISH_SESSION" };

function reducer(
  state: QuizSessionState,
  action: QuizSessionAction
): QuizSessionState {
  switch (action.type) {
    case "INIT":
      return {
        questions: action.questions,
        currentIndex: 0,
        results: [],
        isFinished: false,
        startTimeMs: Date.now(),
        questionStartMs: Date.now(),
      };

    case "ANSWER_QUESTION": {
      const timeMs = Date.now() - state.questionStartMs;
      const result: SessionQuestionResult = {
        questionId: action.questionId,
        categoryId: action.categoryId,
        isCorrect: action.isCorrect,
        timeMs,
        selectedOptionIds: action.selectedOptionIds,
      };
      return { ...state, results: [...state.results, result] };
    }

    case "TIMEOUT": {
      const current = state.questions[state.currentIndex];
      if (!current) return state;
      const timeMs = Date.now() - state.questionStartMs;
      const result: SessionQuestionResult = {
        questionId: current.question.id,
        categoryId: current.categoryId,
        isCorrect: false,
        timeMs,
        selectedOptionIds: [],
      };
      return { ...state, results: [...state.results, result] };
    }

    case "NEXT_QUESTION": {
      const nextIndex = state.currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        return { ...state, isFinished: true };
      }
      return {
        ...state,
        currentIndex: nextIndex,
        questionStartMs: Date.now(),
      };
    }

    case "FINISH_SESSION":
      return { ...state, isFinished: true };

    default:
      return state;
  }
}

const initialState: QuizSessionState = {
  questions: [],
  currentIndex: 0,
  results: [],
  isFinished: false,
  startTimeMs: 0,
  questionStartMs: 0,
};

interface QuizSessionContextValue {
  state: QuizSessionState;
  initSession: (questions: QuizQuestion[]) => void;
  answerQuestion: (
    questionId: string,
    categoryId: string,
    isCorrect: boolean,
    selectedOptionIds: string[]
  ) => void;
  handleTimeout: () => void;
  nextQuestion: () => void;
  finishSession: () => void;
  currentQuestion: QuizQuestion | null;
  totalElapsedMs: () => number;
}

const QuizSessionContext = createContext<QuizSessionContextValue | null>(null);

export function QuizSessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const initSession = useCallback((questions: QuizQuestion[]) => {
    dispatch({ type: "INIT", questions });
  }, []);

  const answerQuestion = useCallback(
    (
      questionId: string,
      categoryId: string,
      isCorrect: boolean,
      selectedOptionIds: string[]
    ) => {
      dispatch({
        type: "ANSWER_QUESTION",
        questionId,
        categoryId,
        isCorrect,
        selectedOptionIds,
      });
    },
    []
  );

  const handleTimeout = useCallback(() => {
    dispatch({ type: "TIMEOUT" });
  }, []);

  const nextQuestion = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION" });
  }, []);

  const finishSession = useCallback(() => {
    dispatch({ type: "FINISH_SESSION" });
  }, []);

  const currentQuestion =
    state.questions[state.currentIndex] ?? null;

  const totalElapsedMs = useCallback(() => {
    return Date.now() - state.startTimeMs;
  }, [state.startTimeMs]);

  return (
    <QuizSessionContext.Provider
      value={{
        state,
        initSession,
        answerQuestion,
        handleTimeout,
        nextQuestion,
        finishSession,
        currentQuestion,
        totalElapsedMs,
      }}
    >
      {children}
    </QuizSessionContext.Provider>
  );
}

export function useQuizSession(): QuizSessionContextValue {
  const ctx = useContext(QuizSessionContext);
  if (!ctx)
    throw new Error(
      "useQuizSession must be used within QuizSessionProvider"
    );
  return ctx;
}

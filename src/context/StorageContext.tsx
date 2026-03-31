import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { StorageSchema, QuizSessionRecord } from "../types/storage";
import {
  loadStorage,
  saveStorage,
  addQuizSession,
  updateQuestionResult,
  getWrongQuestionIds,
  clearHistory as clearHistoryUtil,
} from "../utils/storage";

interface StorageContextValue {
  data: StorageSchema;
  saveQuizSession: (record: QuizSessionRecord) => void;
  updateQuestionBankResult: (questionId: string, categoryId: string, isCorrect: boolean) => void;
  getWrongQuestions: () => string[];
  clearHistory: () => void;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<StorageSchema>(() => loadStorage());

  const persist = useCallback((next: StorageSchema) => {
    setData(next);
    saveStorage(next);
  }, []);

  const saveQuizSessionFn = useCallback(
    (record: QuizSessionRecord) => {
      persist(addQuizSession(data, record));
    },
    [data, persist]
  );

  const updateQuestionBankResultFn = useCallback(
    (questionId: string, categoryId: string, isCorrect: boolean) => {
      persist(updateQuestionResult(data, questionId, categoryId, isCorrect));
    },
    [data, persist]
  );

  const getWrongQuestionsFn = useCallback(() => {
    return getWrongQuestionIds(data);
  }, [data]);

  const clearHistoryFn = useCallback(() => {
    persist(clearHistoryUtil(data));
  }, [data, persist]);

  return (
    <StorageContext.Provider
      value={{
        data,
        saveQuizSession: saveQuizSessionFn,
        updateQuestionBankResult: updateQuestionBankResultFn,
        getWrongQuestions: getWrongQuestionsFn,
        clearHistory: clearHistoryFn,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage(): StorageContextValue {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error("useStorage must be used within StorageProvider");
  return ctx;
}

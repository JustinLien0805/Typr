import type { StorageSchema, QuizSessionRecord, QuestionBankResult } from "../types/storage";

const STORAGE_KEY = "typr_storage";

function getDefaultStorage(): StorageSchema {
  return {
    version: 1,
    quizHistory: [],
    questionBank: { results: {} },
  };
}

export function loadStorage(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultStorage();
    const parsed = JSON.parse(raw) as StorageSchema;
    if (parsed.version !== 1) return getDefaultStorage();
    return parsed;
  } catch {
    return getDefaultStorage();
  }
}

export function saveStorage(data: StorageSchema): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function addQuizSession(data: StorageSchema, record: QuizSessionRecord): StorageSchema {
  return {
    ...data,
    quizHistory: [...data.quizHistory, record],
  };
}

export function updateQuestionResult(
  data: StorageSchema,
  questionId: string,
  categoryId: string,
  isCorrect: boolean
): StorageSchema {
  const existing = data.questionBank.results[questionId];
  const updated: QuestionBankResult = existing
    ? {
        ...existing,
        attempts: existing.attempts + 1,
        correctCount: existing.correctCount + (isCorrect ? 1 : 0),
        lastAttemptDate: new Date().toISOString(),
        lastCorrect: isCorrect,
      }
    : {
        questionId,
        categoryId,
        attempts: 1,
        correctCount: isCorrect ? 1 : 0,
        lastAttemptDate: new Date().toISOString(),
        lastCorrect: isCorrect,
      };

  return {
    ...data,
    questionBank: {
      results: {
        ...data.questionBank.results,
        [questionId]: updated,
      },
    },
  };
}

export function getWrongQuestionIds(data: StorageSchema): string[] {
  return Object.values(data.questionBank.results)
    .filter((r) => !r.lastCorrect)
    .map((r) => r.questionId);
}

export function clearHistory(data: StorageSchema): StorageSchema {
  return { ...data, quizHistory: [] };
}

export interface StorageSchema {
  version: 1;
  quizHistory: QuizSessionRecord[];
  questionBank: {
    results: Record<string, QuestionBankResult>;
  };
}

export interface QuizSessionRecord {
  id: string;
  date: string;
  totalScore: number;
  totalQuestions: number;
  totalTimeMs: number;
  categoryBreakdown: CategoryBreakdown[];
  questions: SessionQuestionResult[];
}

export interface CategoryBreakdown {
  categoryId: string;
  correct: number;
  total: number;
}

export interface SessionQuestionResult {
  questionId: string;
  categoryId: string;
  isCorrect: boolean;
  timeMs: number;
  selectedOptionIds: string[];
}

export interface QuestionBankResult {
  questionId: string;
  categoryId: string;
  attempts: number;
  correctCount: number;
  lastAttemptDate: string;
  lastCorrect: boolean;
}

export interface AnswerResult {
  questionId: string;
  isCorrect: boolean;
  selectedOptionIds: string[];
}

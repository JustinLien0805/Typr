import { getQuestionsByIds, QUIZ_CATEGORIES } from "../data/questionsData";

/** Fisher-Yates shuffle (in-place) */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Select `count` questions balanced across all categories.
 * Each category contributes ceil(count / numCategories) candidates,
 * then results are shuffled and trimmed to exactly `count`.
 */
export function selectBalancedQuestions(count: number = 10) {
  const categories = QUIZ_CATEGORIES;
  const perCategory = Math.ceil(count / categories.length);
  const pool: { question: any; categoryId: string }[] = [];

  for (const cat of categories) {
    const shuffled = shuffle([...cat.questions]);
    const picked = shuffled.slice(0, perCategory);
    pool.push(...picked.map((q: any) => ({ question: q, categoryId: cat.id })));
  }

  return shuffle(pool).slice(0, count);
}

export function selectQuestionsByIds(questionIds: string[]) {
  if (questionIds.length === 0) {
    return [];
  }
  return getQuestionsByIds(questionIds);
}

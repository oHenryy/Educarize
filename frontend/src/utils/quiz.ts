import type { Quiz } from "../types";

/** Garante que as opções venham como array (a API já envia assim, mas registros antigos podem vir como JSON string). */
export const parseOptions = (options: unknown): string[] => {
  if (Array.isArray(options)) return options.map(String);
  if (typeof options === "string") {
    try {
      const parsed: unknown = JSON.parse(options);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const normalizeQuiz = (quiz: Quiz): Quiz => ({
  ...quiz,
  questions: quiz.questions.map((q) => ({ ...q, options: parseOptions(q.options) })),
});

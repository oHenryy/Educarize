export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateDifficulty = (difficulty: string): boolean => {
  return ["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(difficulty);
};

export const validateStatus = (status: string): boolean => {
  return ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"].includes(status);
};

/** Aceita apenas URLs http(s) absolutas (bloqueia javascript:, data:, etc). */
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

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


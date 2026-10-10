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

/** Garante que uma nova ordenação contém exatamente os itens atuais (sem faltar, repetir ou sobrar). */
export const isSameIdSet = (currentIds: string[], newIds: string[]): boolean => {
  const current = new Set(currentIds);
  return newIds.length === current.size && new Set(newIds).size === newIds.length && newIds.every((id) => current.has(id));
};

/** Texto de um parâmetro de query (`?q=a&q=b` chega como lista: usa o primeiro). */
export const queryString = (value: unknown): string | undefined => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first : undefined;
};

/** Cabeçalho Content-Disposition com nome em ASCII (navegadores antigos) e em UTF-8 (RFC 5987). */
export const contentDisposition = (type: "inline" | "attachment", fileName: string): string => {
  const ascii = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
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

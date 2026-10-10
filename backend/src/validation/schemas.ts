import { z } from "zod";

// ---------- blocos reutilizáveis ----------
const id = z.string({ required_error: "ID é obrigatório" }).trim().min(1, "ID é obrigatório").max(64, "ID inválido");
const text = (label: string, max: number, gender: "m" | "f" = "m") =>
  z.string({
    required_error: `${label} é ${gender === "f" ? "obrigatória" : "obrigatório"}`,
    invalid_type_error: `${label} deve ser texto`,
  })
    .trim()
    .min(1, `${label} é ${gender === "f" ? "obrigatória" : "obrigatório"}`)
    .max(max, `${label} deve ter no máximo ${max} caracteres`);
const optionalText = (label: string, max: number) =>
  z.string({ invalid_type_error: `${label} deve ser texto` })
    .max(max, `${label} deve ter no máximo ${max} caracteres`)
    .nullish();
/** URL opcional: aceita vazio (para limpar o campo); a checagem de protocolo fica no service. */
const optionalUrl = (label: string) =>
  z.string({ invalid_type_error: `${label} deve ser texto` })
    .trim()
    .max(2048, `${label} deve ter no máximo 2048 caracteres`)
    .nullish();
const intRange = (label: string, min: number, max: number) =>
  z.number({ invalid_type_error: `${label} deve ser um número` })
    .int(`${label} deve ser um número inteiro`)
    .min(min, `${label} deve ser no mínimo ${min}`)
    .max(max, `${label} deve ser no máximo ${max}`);
const password = (label: string) =>
  z.string({ required_error: `${label} é obrigatória` })
    .min(6, `${label} deve ter pelo menos 6 caracteres`)
    .max(128, `${label} deve ter no máximo 128 caracteres`);

const difficulty = z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"], {
  errorMap: () => ({ message: "Dificuldade inválida. Use: BEGINNER, INTERMEDIATE ou ADVANCED" }),
});
const courseStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"], {
  errorMap: () => ({ message: "Status inválido. Use: DRAFT, PUBLISHED, ARCHIVED ou SUSPENDED" }),
});
const pathStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"], {
  errorMap: () => ({ message: "Status inválido. Use: DRAFT, PUBLISHED ou ARCHIVED" }),
});

// ---------- params / query ----------
export const idParam = z.object({ id }).passthrough();

/** page/limit vêm como texto na query string; limit é limitado a 100 para evitar consultas enormes. */
export const paginationQuery = z
  .object({
    page: z.coerce.number().int().min(1, "page deve ser >= 1").optional(),
    limit: z.coerce.number().int().min(1, "limit deve ser >= 1").max(100, "limit deve ser no máximo 100").optional(),
  })
  .passthrough();

// ---------- auth / admin ----------
export const registerBody = z.object({
  name: text("Nome", 100),
  email: z.string({ required_error: "Email é obrigatório" }).trim().toLowerCase().email("Email inválido").max(254),
  password: password("Senha"),
  // Papéis não permitidos (ex.: ADMIN) são convertidos em STUDENT pelo service.
  role: z.string().optional(),
});

export const loginBody = z.object({
  email: z.string({ required_error: "Email é obrigatório" }).trim().min(1, "Email é obrigatório").max(254),
  password: z.string({ required_error: "Senha é obrigatória" }).min(1, "Senha é obrigatória").max(128),
});

export const changePasswordBody = z.object({
  currentPassword: z.string({ required_error: "Senha atual é obrigatória" }).min(1, "Senha atual é obrigatória").max(128),
  newPassword: password("A nova senha"),
});

/** Busca de usuários (seletor de conversa, transferência de conteúdo). */
export const usersQuery = z.object({
  search: z.string().trim().max(100).optional(),
  roles: z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").map((r) => r.trim().toUpperCase()) : undefined))
    .pipe(z.array(z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"])).optional()),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const forgotPasswordBody = z.object({
  email: z.string({ required_error: "Email é obrigatório" }).trim().min(1, "Email é obrigatório").max(254),
});

export const tokenBody = z.object({
  token: z.string({ required_error: "Token é obrigatório" }).min(1, "Token é obrigatório").max(200),
});

export const resetPasswordWithTokenBody = tokenBody.extend({ newPassword: password("A nova senha") });

export const updateRoleBody = z.object({
  role: z.enum(["ADMIN", "INSTRUCTOR", "STUDENT"], { errorMap: () => ({ message: "Papel inválido" }) }),
});

export const resetPasswordBody = z.object({ newPassword: password("A senha") });

export const transferContentBody = z.object({ targetUserId: id });

// ---------- catálogo ----------
export const categoryBody = z.object({
  name: text("Nome", 80),
  description: optionalText("Descrição", 500),
});

export const createCourseBody = z.object({
  title: text("Título", 200),
  description: optionalText("Descrição", 5000),
  coverImageUrl: optionalUrl("URL da capa"),
  durationHours: intRange("Carga horária", 0, 10000).optional(),
  difficulty: difficulty.optional(),
  categoryId: z.string().max(64).nullish(),
});

export const updateCourseBody = createCourseBody.partial().extend({ status: courseStatus.optional() });

export const createModuleBody = z.object({
  title: text("Título", 200),
  description: optionalText("Descrição", 2000),
  order: intRange("Ordem", 0, 10000).optional(),
  courseId: id,
});

export const updateModuleBody = createModuleBody.omit({ courseId: true }).partial();

export const createLessonBody = z.object({
  title: text("Título", 200),
  description: optionalText("Descrição", 5000),
  videoUrl: optionalUrl("Link do vídeo"),
  durationMinutes: intRange("Duração", 0, 100000).optional(),
  order: intRange("Ordem", 0, 10000).optional(),
  moduleId: id,
});

export const updateLessonBody = createLessonBody.omit({ moduleId: true }).partial();

export const attachmentBody = z.object({
  name: text("Nome", 200),
  description: optionalText("Descrição", 2000),
  fileUrl: z.string({ required_error: "Link do arquivo é obrigatório" }).trim().min(1, "Link do arquivo é obrigatório").max(2048),
  fileType: text("Tipo do arquivo", 50),
  fileSize: z.number().int().min(0).nullish(),
  category: optionalText("Categoria", 50),
  order: intRange("Ordem", 0, 10000).optional(),
  thumbnailUrl: optionalUrl("Link da miniatura"),
});

export const updateAttachmentBody = attachmentBody.partial();

// ---------- quizzes ----------
export const createQuizBody = z.object({
  moduleId: id,
  title: text("Título", 200),
  description: optionalText("Descrição", 2000),
  passingScore: intRange("Nota mínima", 0, 100).optional(),
});

export const updateQuizBody = createQuizBody.omit({ moduleId: true }).partial();

const questionFields = {
  question: text("Pergunta", 1000, "f"),
  options: z
    .array(text("Opção", 500, "f"), { invalid_type_error: "options deve ser um array" })
    .min(2, "options deve ser um array com pelo menos 2 opções")
    .max(10, "No máximo 10 opções"),
  correctAnswer: z.number({ required_error: "correctAnswer é obrigatório" }).int("Resposta correta inválida"),
  order: intRange("Ordem", 0, 10000).optional(),
};

export const createQuestionBody = z.object({ quizId: id, ...questionFields });
export const updateQuestionBody = z.object(questionFields).partial();

export const quizAttemptBody = z.object({
  quizId: id,
  answers: z.record(z.string().max(64), z.number().int()),
});

// ---------- interação ----------
export const createCommentBody = z.object({
  lessonId: id,
  content: text("Comentário", 5000),
  parentId: id.nullish(),
});
export const updateCommentBody = z.object({ content: text("Comentário", 5000) });

export const createNoteBody = z.object({ lessonId: id, content: text("Anotação", 10000, "f") });
export const updateNoteBody = z.object({ content: text("Anotação", 10000, "f") });

export const createReviewBody = z.object({
  courseId: id,
  rating: intRange("Avaliação", 1, 5),
  comment: optionalText("Comentário", 2000),
});
export const updateReviewBody = createReviewBody.omit({ courseId: true }).partial();

export const sendMessageBody = z.object({ receiverId: id, content: text("Mensagem", 5000, "f") });

export const courseIdBody = z.object({ courseId: id });
export const lessonIdBody = z.object({ lessonId: id });

export const tagBody = z.object({ name: text("Nome da tag", 50) });
export const courseTagBody = z.object({ tagName: text("Nome da tag", 50) });

// ---------- trilhas ----------
export const createLearningPathBody = z.object({
  title: text("Título", 200),
  description: optionalText("Descrição", 5000),
  coverImageUrl: optionalUrl("URL da capa"),
  difficulty: difficulty.nullish(),
  estimatedHours: intRange("Horas estimadas", 0, 100000).nullish(),
  status: pathStatus.optional(),
});
export const updateLearningPathBody = createLearningPathBody.partial();

export const addPathCourseBody = z.object({
  courseId: id,
  order: intRange("Ordem", 0, 10000).optional(),
  isRequired: z.boolean().optional(),
});

export const reorderPathCoursesBody = z.object({
  courseIds: z.array(id, { invalid_type_error: "courseIds deve ser uma lista de IDs de curso" }).max(200),
});

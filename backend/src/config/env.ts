import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (isProduction) {
    throw new Error("JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar em produção.");
  }

  console.warn("[AVISO] JWT_SECRET não definido. Usando chave de desenvolvimento — NÃO use em produção.");
  return "dev-secret";
}

function resolveSameSite(): "lax" | "strict" | "none" {
  const value = (process.env.COOKIE_SAMESITE || "lax").toLowerCase();
  if (value === "lax" || value === "strict" || value === "none") return value;
  throw new Error("COOKIE_SAMESITE deve ser 'lax', 'strict' ou 'none'");
}

const minutes = (n: number) => n * 60 * 1000;
const days = (n: number) => n * 24 * 60 * 60 * 1000;

export const config = {
  isProduction,
  port: process.env.PORT || 4000,
  jwtSecret: resolveJwtSecret(),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  /** Pasta antiga dos certificados (lida apenas para PDFs emitidos antes do storage). */
  certificatesDir: process.env.CERTIFICATES_DIR || "certificates",

  // Arquivos (capas, anexos e certificados): disco local ou, com S3_BUCKET, storage compatível com S3.
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  /** Endereço público da API para montar os links dos arquivos (padrão: o host da requisição). */
  publicApiUrl: (process.env.PUBLIC_API_URL || "").replace(/\/$/, ""),
  /** Intervalo da limpeza de arquivos sem uso (0 desativa a execução automática). */
  fileCleanupIntervalHours: Number(process.env.FILE_CLEANUP_INTERVAL_HOURS ?? 6),
  /** Idade mínima para um arquivo sem uso ser removido (dá tempo de terminar o formulário). */
  fileCleanupGraceHours: Number(process.env.FILE_CLEANUP_GRACE_HOURS ?? 24),
  s3: {
    bucket: process.env.S3_BUCKET || "",
    region: process.env.S3_REGION || "us-east-1",
    endpoint: process.env.S3_ENDPOINT || "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    /** Cria o bucket se ele não existir (útil com Silo/MinIO locais; em produção, crie-o antes). */
    createBucket: process.env.S3_CREATE_BUCKET === "true",
  },
  authRateLimitMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  authRateLimitWindowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || minutes(15),

  // Sessão (cookies httpOnly)
  accessTokenTtlMs: Number(process.env.ACCESS_TOKEN_TTL_MINUTES) * 60 * 1000 || minutes(15),
  refreshTokenTtlMs: Number(process.env.REFRESH_TOKEN_TTL_DAYS) * 24 * 60 * 60 * 1000 || days(7),
  cookieSecure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : isProduction,
  cookieSameSite: resolveSameSite(),

  // E-mail (sem SMTP_HOST os e-mails são apenas exibidos no console)
  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  mailFrom: process.env.MAIL_FROM || "Educarize <no-reply@educarize.local>",
  passwordResetTtlMs: minutes(60),
  emailVerificationTtlMs: days(2),
} as const;

/** Lido a cada uso para permitir alternar em testes. */
export const requireEmailVerification = () => process.env.REQUIRE_EMAIL_VERIFICATION === "true";

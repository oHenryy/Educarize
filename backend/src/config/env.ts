import dotenv from "dotenv";

dotenv.config();

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET não definido. Configure a variável de ambiente antes de iniciar em produção.");
  }

  console.warn("[AVISO] JWT_SECRET não definido. Usando chave de desenvolvimento — NÃO use em produção.");
  return "dev-secret";
}

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: resolveJwtSecret(),
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
} as const;

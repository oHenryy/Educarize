import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  databaseUrl: process.env.DATABASE_URL || "file:./dev.db",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
} as const;


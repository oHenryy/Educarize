// Prepara o schema "e2e" no PostgreSQL (com Redis) e sobe o backend para os testes de ponta a ponta.
import { execSync, spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(here, "../../backend");
const root = path.join(os.tmpdir(), "educarize-e2e");

fs.rmSync(root, { recursive: true, force: true });
fs.mkdirSync(path.join(root, "certificates"), { recursive: true });

// PostgreSQL em um schema próprio ("e2e"), recriado a cada execução.
const databaseUrl = new URL(process.env.E2E_DATABASE_URL || "postgresql://educarize:educarize@localhost:5432/educarize");
databaseUrl.searchParams.set("schema", "e2e");

const env = {
  ...process.env,
  DATABASE_URL: databaseUrl.toString(),
  // Exercita o caminho com Redis (rate limit e Socket.io compartilhados), como em produção.
  REDIS_URL: process.env.E2E_REDIS_URL || "redis://localhost:6379",
  CERTIFICATES_DIR: path.join(root, "certificates"),
  JWT_SECRET: "e2e-secret",
  PORT: process.env.E2E_API_PORT || "4600",
  FRONTEND_URL: `http://localhost:${process.env.E2E_APP_PORT || "5180"}`,
  AUTH_RATE_LIMIT_MAX: "1000",
  // Os testes leem os e-mails (redefinição de senha, verificação) desta pasta.
  MAIL_OUTBOX_DIR: path.join(root, "outbox"),
};

const run = (cmd, options = {}) => execSync(cmd, { cwd: backendDir, env, stdio: "inherit", ...options });
run("npx prisma db execute --stdin", {
  input: 'DROP SCHEMA IF EXISTS "e2e" CASCADE;',
  stdio: ["pipe", "inherit", "inherit"],
});
run("npx prisma migrate deploy");
run('npx ts-node --transpile-only src/scripts/createAdmin.ts "Admin E2E" admin@e2e.test admin123');

const server = spawn("npx", ["ts-node", "--transpile-only", "src/index.ts"], {
  cwd: backendDir,
  env,
  stdio: "inherit",
  shell: true,
});
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));

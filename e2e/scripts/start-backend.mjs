// Prepara um banco SQLite descartável e sobe o backend para os testes de ponta a ponta.
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

const env = {
  ...process.env,
  DATABASE_URL: `file:${path.join(root, "e2e.db").replace(/\\/g, "/")}`,
  CERTIFICATES_DIR: path.join(root, "certificates"),
  JWT_SECRET: "e2e-secret",
  PORT: process.env.E2E_API_PORT || "4600",
  FRONTEND_URL: `http://localhost:${process.env.E2E_APP_PORT || "5180"}`,
  AUTH_RATE_LIMIT_MAX: "1000",
  // Os testes leem os e-mails (redefinição de senha, verificação) desta pasta.
  MAIL_OUTBOX_DIR: path.join(root, "outbox"),
};

const run = (cmd) => execSync(cmd, { cwd: backendDir, env, stdio: "inherit" });
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

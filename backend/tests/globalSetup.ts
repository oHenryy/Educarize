import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { testPaths } from "./testPaths";

const backendDir = path.resolve(__dirname, "..");
const env = { ...process.env, DATABASE_URL: testPaths.databaseUrl };

function dropSchema() {
  execSync("npx prisma db execute --stdin", {
    cwd: backendDir,
    env,
    input: `DROP SCHEMA IF EXISTS "${testPaths.schema}" CASCADE;`,
    stdio: ["pipe", "pipe", "pipe"],
  });
}

/** Cria um schema PostgreSQL isolado com as migrações antes da execução e o remove no final. */
export default function setup() {
  fs.rmSync(testPaths.root, { recursive: true, force: true });
  fs.mkdirSync(testPaths.certificates, { recursive: true });

  try {
    dropSchema();
    execSync("npx prisma migrate deploy", { cwd: backendDir, env, stdio: "pipe" });
  } catch (error) {
    const output = (error as { stderr?: Buffer }).stderr?.toString() ?? String(error);
    throw new Error(
      `Não foi possível preparar o banco de testes em ${testPaths.databaseUrl.replace(/:[^:@/]+@/, ":***@")}.\n` +
        `Suba o PostgreSQL com "docker compose up -d" (ou defina TEST_DATABASE_URL).\n\n${output}`
    );
  }

  return () => {
    dropSchema();
    fs.rmSync(testPaths.root, { recursive: true, force: true });
  };
}

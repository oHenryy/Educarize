import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { testPaths } from "./testPaths";

/** Recria o banco de testes a partir das migrações antes de cada execução. */
export default function setup() {
  fs.rmSync(testPaths.root, { recursive: true, force: true });
  fs.mkdirSync(testPaths.certificates, { recursive: true });

  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: `file:${testPaths.database}` },
    stdio: "pipe",
  });

  return () => {
    fs.rmSync(testPaths.root, { recursive: true, force: true });
  };
}

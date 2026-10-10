import { defineConfig } from "vitest/config";
import { testPaths } from "./tests/testPaths";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/globalSetup.ts"],
    // Os arquivos compartilham o mesmo schema de banco: rodam em sequência para não interferirem entre si.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testPaths.databaseUrl,
      JWT_SECRET: "test-secret",
      CERTIFICATES_DIR: testPaths.certificates,
      // O limitador é testado isoladamente; aqui não pode atrapalhar os demais testes.
      AUTH_RATE_LIMIT_MAX: "10000",
    },
  },
});

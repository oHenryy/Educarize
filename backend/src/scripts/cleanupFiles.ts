import { prisma } from "../config/database";
import { config } from "../config/env";
import { runFileCleanup } from "../jobs/fileCleanup";

/**
 * Limpeza manual de arquivos sem uso (o servidor também a executa periodicamente).
 * Uso: npm run cleanup-files -- [horas de carência, padrão FILE_CLEANUP_GRACE_HOURS]
 */
async function main() {
  const graceHours = process.argv[2] !== undefined ? Number(process.argv[2]) : config.fileCleanupGraceHours;
  if (!Number.isFinite(graceHours) || graceHours < 0) {
    throw new Error("Informe as horas de carência como um número maior ou igual a zero");
  }

  console.log(`Removendo arquivos sem uso enviados há mais de ${graceHours} hora(s)...`);
  const { removed, freedBytes } = await runFileCleanup(graceHours);
  console.log(`Concluído: ${removed} arquivo(s) removido(s), ${(freedBytes / (1024 * 1024)).toFixed(1)} MB liberados.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

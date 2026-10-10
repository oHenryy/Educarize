import { config } from "../config/env";
import { FileService } from "../services/fileService";

const HOUR = 60 * 60 * 1000;
const fileService = new FileService();

/** Executa uma limpeza e registra o resultado no log. */
export async function runFileCleanup(graceHours = config.fileCleanupGraceHours) {
  const result = await fileService.cleanupOrphans(graceHours * HOUR);
  if (result.removed > 0) {
    console.log(
      `[limpeza de arquivos] ${result.removed} arquivo(s) sem uso removido(s), ${(result.freedBytes / (1024 * 1024)).toFixed(1)} MB liberados`
    );
  }
  return result;
}

/**
 * Agenda a limpeza periódica dentro do servidor. Com várias instâncias, cada uma roda a sua:
 * a remoção é idempotente, então execuções simultâneas não causam erro.
 */
export function startFileCleanupJob(): void {
  const intervalHours = config.fileCleanupIntervalHours;
  if (!(intervalHours > 0)) return;

  const run = () => runFileCleanup().catch((err) => console.error("[limpeza de arquivos] falhou:", err));
  // Primeira execução pouco depois de subir, sem atrasar a inicialização.
  setTimeout(run, 60 * 1000).unref();
  setInterval(run, intervalHours * HOUR).unref();
}

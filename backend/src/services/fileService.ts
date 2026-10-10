import crypto from "crypto";
import path from "path";
import type { FilePurpose, Prisma, StoredFile } from "@prisma/client";
import { prisma } from "../config/database";
import { config } from "../config/env";
import { storage } from "../storage/fileStorage";
import { AuthUser, assertCourseContentAccess } from "../utils/courseAccess";
import { HttpError } from "../utils/httpError";

const MB = 1024 * 1024;

/** Tamanho máximo por finalidade. */
export const MAX_FILE_SIZE: Record<FilePurpose, number> = {
  COVER: 5 * MB,
  ATTACHMENT: 50 * MB,
};

/** Maior limite entre as finalidades (usado no parser do upload). */
export const MAX_UPLOAD_SIZE = Math.max(...Object.values(MAX_FILE_SIZE));

type FileKind = "PDF" | "ZIP" | "IMAGE" | "DOCUMENT" | "VIDEO" | "OTHER";
type TypeInfo = { mimeType: string; fileType: FileKind; signature?: (buffer: Buffer) => boolean };

const startsWith = (bytes: number[]) => (buffer: Buffer) => bytes.every((byte, i) => buffer[i] === byte);
const isPng = startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isJpeg = startsWith([0xff, 0xd8, 0xff]);
const isGif = (buffer: Buffer) => buffer.subarray(0, 4).toString("latin1") === "GIF8";
const isWebp = (buffer: Buffer) =>
  buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP";
const isPdf = (buffer: Buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-";
// Formatos do Office modernos (docx, xlsx, pptx) e do LibreOffice também são arquivos ZIP.
const isZip = startsWith([0x50, 0x4b, 0x03, 0x04]);

const IMAGE_TYPES: Record<string, TypeInfo> = {
  png: { mimeType: "image/png", fileType: "IMAGE", signature: isPng },
  jpg: { mimeType: "image/jpeg", fileType: "IMAGE", signature: isJpeg },
  jpeg: { mimeType: "image/jpeg", fileType: "IMAGE", signature: isJpeg },
  gif: { mimeType: "image/gif", fileType: "IMAGE", signature: isGif },
  webp: { mimeType: "image/webp", fileType: "IMAGE", signature: isWebp },
};

/**
 * Tipos aceitos como material de aula. O tipo é decidido pela extensão (nunca pelo Content-Type
 * enviado pelo navegador) e, quando possível, conferido pela assinatura do arquivo. HTML, SVG e
 * scripts ficam de fora: poderiam executar código ao serem abertos a partir do domínio da API.
 */
const ATTACHMENT_TYPES: Record<string, TypeInfo> = {
  ...IMAGE_TYPES,
  pdf: { mimeType: "application/pdf", fileType: "PDF", signature: isPdf },
  zip: { mimeType: "application/zip", fileType: "ZIP", signature: isZip },
  doc: { mimeType: "application/msword", fileType: "DOCUMENT" },
  docx: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileType: "DOCUMENT", signature: isZip },
  xls: { mimeType: "application/vnd.ms-excel", fileType: "DOCUMENT" },
  xlsx: { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileType: "DOCUMENT", signature: isZip },
  ppt: { mimeType: "application/vnd.ms-powerpoint", fileType: "DOCUMENT" },
  pptx: { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", fileType: "DOCUMENT", signature: isZip },
  odt: { mimeType: "application/vnd.oasis.opendocument.text", fileType: "DOCUMENT", signature: isZip },
  ods: { mimeType: "application/vnd.oasis.opendocument.spreadsheet", fileType: "DOCUMENT", signature: isZip },
  odp: { mimeType: "application/vnd.oasis.opendocument.presentation", fileType: "DOCUMENT", signature: isZip },
  txt: { mimeType: "text/plain; charset=utf-8", fileType: "DOCUMENT" },
  csv: { mimeType: "text/csv; charset=utf-8", fileType: "DOCUMENT" },
  md: { mimeType: "text/markdown; charset=utf-8", fileType: "DOCUMENT" },
  mp4: { mimeType: "video/mp4", fileType: "VIDEO" },
  webm: { mimeType: "video/webm", fileType: "VIDEO" },
  mp3: { mimeType: "audio/mpeg", fileType: "OTHER" },
};

const ALLOWED_TYPES: Record<FilePurpose, Record<string, TypeInfo>> = {
  COVER: IMAGE_TYPES,
  ATTACHMENT: ATTACHMENT_TYPES,
};

const KEY_PREFIX: Record<FilePurpose, string> = { COVER: "covers", ATTACHMENT: "attachments" };

export const describeAllowedTypes = (purpose: FilePurpose) => Object.keys(ALLOWED_TYPES[purpose]).join(", ");

export function fileKind(file: Pick<StoredFile, "key">): FileKind {
  const ext = path.extname(file.key).slice(1);
  return ATTACHMENT_TYPES[ext]?.fileType ?? "OTHER";
}

/** Link público do arquivo (passa sempre pela API, que confere o acesso). */
export function fileUrl(fileId: string, requestOrigin: string): string {
  return `${config.publicApiUrl || requestOrigin}/files/${fileId}`;
}

/** Extrai o ID de um link gerado por fileUrl (ou null se o link for externo). */
export function fileIdFromUrl(url: string | null | undefined): string | null {
  return url?.match(/\/files\/([a-z0-9]+)$/i)?.[1] ?? null;
}

export function toFileDto(file: StoredFile, requestOrigin: string) {
  return {
    id: file.id,
    url: fileUrl(file.id, requestOrigin),
    name: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    fileType: fileKind(file),
    purpose: file.purpose,
  };
}

export class FileService {
  async upload(input: { buffer: Buffer; originalName: string; purpose: FilePurpose; ownerId: string }) {
    const { buffer, purpose } = input;
    const originalName = path.basename(input.originalName).slice(0, 255) || "arquivo";
    const ext = path.extname(originalName).slice(1).toLowerCase();
    const type = ALLOWED_TYPES[purpose][ext];

    if (!type) {
      throw new HttpError(400, `Tipo de arquivo não permitido. Use: ${describeAllowedTypes(purpose)}.`);
    }
    if (buffer.length === 0) {
      throw new HttpError(400, "O arquivo está vazio");
    }
    if (buffer.length > MAX_FILE_SIZE[purpose]) {
      throw new HttpError(413, `O arquivo deve ter no máximo ${MAX_FILE_SIZE[purpose] / MB} MB`);
    }
    if (type.signature && !type.signature(buffer)) {
      throw new HttpError(400, `O conteúdo do arquivo não corresponde à extensão .${ext}`);
    }

    const key = `${KEY_PREFIX[purpose]}/${crypto.randomUUID()}.${ext}`;
    await storage.put(key, buffer, type.mimeType);

    return prisma.storedFile.create({
      data: { key, purpose, originalName, mimeType: type.mimeType, size: buffer.length, ownerId: input.ownerId },
    });
  }

  /** Abre o arquivo para download, conferindo o acesso: capas são públicas; anexos seguem o curso. */
  async open(fileId: string, user: AuthUser | undefined) {
    const file = await prisma.storedFile.findUnique({
      where: { id: fileId },
      include: { attachments: { select: { lesson: { select: { module: { select: { courseId: true } } } } } } },
    });
    if (!file) throw new HttpError(404, "Arquivo não encontrado");

    if (file.purpose === "ATTACHMENT") {
      if (!user) throw new HttpError(401, "Faça login para baixar este arquivo");
      const isOwner = user.role === "ADMIN" || file.ownerId === user.userId;
      if (!isOwner && !(await this.canAccessAnyCourse(file.attachments.map((a) => a.lesson.module.courseId), user))) {
        throw new HttpError(403, "Sem acesso a este arquivo");
      }
    }

    const stream = await storage.get(file.key);
    if (!stream) throw new HttpError(404, "Arquivo não encontrado");
    return { file, stream };
  }

  private async canAccessAnyCourse(courseIds: string[], user: AuthUser): Promise<boolean> {
    for (const courseId of new Set(courseIds)) {
      try {
        await assertCourseContentAccess(courseId, user);
        return true;
      } catch {
        // Sem acesso a este curso: tenta o próximo que usa o mesmo arquivo.
      }
    }
    return false;
  }

  /** Arquivo enviado pelo próprio usuário (ou qualquer um, para admins), com a finalidade esperada. */
  async assertUsable(fileId: string, purpose: FilePurpose, user: AuthUser): Promise<StoredFile> {
    const file = await prisma.storedFile.findUnique({ where: { id: fileId } });
    if (!file || file.purpose !== purpose) throw new HttpError(400, "Arquivo enviado não encontrado");
    if (file.ownerId !== user.userId && user.role !== "ADMIN") {
      throw new HttpError(403, "Use um arquivo enviado por você");
    }
    return file;
  }

  /** Remove o arquivo do storage e do banco se nenhum anexo o usa mais. */
  async deleteIfUnused(fileId: string | null | undefined): Promise<void> {
    if (!fileId) return;
    const file = await prisma.storedFile.findUnique({
      where: { id: fileId },
      include: { _count: { select: { attachments: true } } },
    });
    if (!file || file._count.attachments > 0) return;
    await this.remove(file);
  }

  /** Arquivos dos anexos que serão apagados em cascata (curso, módulo ou aula excluídos). */
  async attachmentFileIds(where: Prisma.LessonAttachmentWhereInput): Promise<string[]> {
    const attachments = await prisma.lessonAttachment.findMany({
      where: { ...where, fileId: { not: null } },
      select: { fileId: true },
    });
    return [...new Set(attachments.map((a) => a.fileId!))];
  }

  async deleteAllIfUnused(fileIds: string[]): Promise<void> {
    for (const fileId of fileIds) await this.deleteIfUnused(fileId);
  }

  /** Remove a capa antiga quando ela era um arquivo enviado ao Educarize. */
  async deleteCoverByUrl(url: string | null | undefined): Promise<void> {
    const id = fileIdFromUrl(url);
    if (!id) return;
    const file = await prisma.storedFile.findUnique({ where: { id } });
    // O mesmo link pode ter sido usado como capa de outro curso ou de uma trilha.
    if (file?.purpose === "COVER" && !(await this.coversInUse([id])).has(id)) await this.remove(file);
  }

  /** Quais destas capas ainda aparecem em algum curso ou trilha. */
  private async coversInUse(ids: string[]): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const where = { OR: ids.map((id) => ({ coverImageUrl: { endsWith: `/files/${id}` } })) };
    const [courses, paths] = await Promise.all([
      prisma.course.findMany({ where, select: { coverImageUrl: true } }),
      prisma.learningPath.findMany({ where, select: { coverImageUrl: true } }),
    ]);
    return new Set([...courses, ...paths].map((item) => fileIdFromUrl(item.coverImageUrl)!).filter(Boolean));
  }

  /**
   * Rotina de limpeza: remove arquivos que ninguém usa (material nunca anexado, capa enviada e não
   * salva, referências perdidas). Só considera arquivos com mais de `graceMs`, para não apagar um
   * envio cujo formulário ainda está aberto.
   */
  async cleanupOrphans(graceMs: number, batchSize = 200): Promise<{ removed: number; freedBytes: number }> {
    const cutoff = new Date(Date.now() - graceMs);
    let removed = 0;
    let freedBytes = 0;
    let cursor: string | undefined;

    for (;;) {
      const batch = await prisma.storedFile.findMany({
        where: { createdAt: { lt: cutoff } },
        include: { _count: { select: { attachments: true } } },
        orderBy: { id: "asc" },
        take: batchSize,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      const covers = await this.coversInUse(batch.filter((f) => f.purpose === "COVER").map((f) => f.id));
      for (const file of batch) {
        const inUse = file.purpose === "COVER" ? covers.has(file.id) : file._count.attachments > 0;
        if (inUse) continue;
        if (await this.remove(file)) {
          removed += 1;
          freedBytes += file.size;
        }
      }
      if (batch.length < batchSize) break;
    }

    return { removed, freedBytes };
  }

  /** Remove do banco e do storage. Retorna false se outra instância já tinha removido. */
  private async remove(file: StoredFile): Promise<boolean> {
    const { count } = await prisma.storedFile.deleteMany({ where: { id: file.id } });
    await storage.delete(file.key).catch((err) => console.error("Erro ao remover arquivo do storage:", err));
    return count > 0;
  }
}

import { api } from "./client";
import type { UploadedFile } from "../types";

export type UploadPurpose = "cover" | "attachment";

const MB = 1024 * 1024;

/** Mesmos limites e tipos do backend (conferidos lá de novo; aqui só evitam esperar o envio). */
export const UPLOAD_RULES: Record<UploadPurpose, { maxBytes: number; accept: string }> = {
  cover: { maxBytes: 5 * MB, accept: ".png,.jpg,.jpeg,.gif,.webp" },
  attachment: {
    maxBytes: 50 * MB,
    accept:
      ".pdf,.zip,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.md,.mp4,.webm,.mp3",
  },
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

/** Envia um arquivo para a API (disco ou S3, conforme o servidor). `onProgress` recebe de 0 a 100. */
export async function uploadFile(file: File, purpose: UploadPurpose, onProgress?: (percent: number) => void) {
  const { maxBytes } = UPLOAD_RULES[purpose];
  if (file.size > maxBytes) {
    throw new Error(`O arquivo deve ter no máximo ${formatBytes(maxBytes)}`);
  }

  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", file);
  const res = await api.post<UploadedFile>("/files", form, {
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
    },
  });
  return res.data;
}

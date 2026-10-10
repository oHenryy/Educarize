import { useId, useState } from "react";
import { isAxiosError } from "axios";
import { getErrorMessage } from "../api/client";
import { UPLOAD_RULES, formatBytes, uploadFile, type UploadPurpose } from "../api/files";
import type { UploadedFile } from "../types";

type FilePickerProps = {
  purpose: UploadPurpose;
  label: string;
  onUploaded: (file: UploadedFile) => void;
  disabled?: boolean;
};

/** Escolhe um arquivo e o envia na hora, mostrando o progresso e os erros de validação. */
export default function FilePicker({ purpose, label, onUploaded, disabled = false }: FilePickerProps) {
  const inputId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { accept, maxBytes } = UPLOAD_RULES[purpose];

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      onUploaded(await uploadFile(file, purpose, setProgress));
    } catch (err) {
      setError(isAxiosError(err) ? getErrorMessage(err, "Erro ao enviar arquivo") : (err as Error).message);
    } finally {
      setProgress(null);
      input.value = "";
    }
  };

  return (
    <div className="file-picker">
      <label htmlFor={inputId} className={`btn-secondary file-picker-button${disabled || progress !== null ? " disabled" : ""}`}>
        {progress !== null ? `Enviando... ${progress}%` : label}
      </label>
      <input
        id={inputId}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={disabled || progress !== null}
        className="visually-hidden"
        aria-label={label}
      />
      <small className="muted">Até {formatBytes(maxBytes)}.</small>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

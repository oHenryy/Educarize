import { Response } from "express";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function sendError(res: Response, error: any, fallbackStatus = 500, fallbackMessage?: string): void {
  const status = error instanceof HttpError ? error.status : fallbackStatus;
  res.status(status).json({ error: error?.message || fallbackMessage || "Erro interno" });
}

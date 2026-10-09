import { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type ErrorBody = { error: string; details?: { field: string; message: string }[] };

/** Converte qualquer erro em { status, corpo }, sem vazar detalhes internos em erros inesperados. */
export function toHttpResponse(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof HttpError) {
    return { status: error.status, body: { error: error.message } };
  }

  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: error.issues[0]?.message || "Dados inválidos",
        details: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025") return { status: 404, body: { error: "Registro não encontrado" } };
    if (error.code === "P2002") return { status: 409, body: { error: "Registro duplicado" } };
    if (error.code === "P2003") return { status: 400, body: { error: "Referência inválida" } };
  }

  // Erros do body-parser (JSON malformado, corpo grande demais) já trazem o status.
  const status = (error as { status?: number; type?: string })?.status;
  if (status === 400 && (error as { type?: string }).type === "entity.parse.failed") {
    return { status: 400, body: { error: "JSON inválido no corpo da requisição" } };
  }
  if (status === 413) {
    return { status: 413, body: { error: "Corpo da requisição muito grande" } };
  }

  console.error("Erro não tratado:", error);
  return { status: 500, body: { error: "Erro interno do servidor" } };
}

export function sendError(res: Response, error: unknown): void {
  const { status, body } = toHttpResponse(error);
  res.status(status).json(body);
}

/** Middleware final do Express: garante resposta JSON para qualquer erro não capturado. */
export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  sendError(res, error);
}

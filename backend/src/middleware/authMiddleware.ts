import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { prisma } from "../config/database";

type JwtPayload = {
  userId: string;
  role: "ADMIN" | "INSTRUCTOR" | "STUDENT";
};

declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

/**
 * Valida o token e carrega o papel atual do banco, para que mudanças de papel
 * ou exclusão do usuário tenham efeito imediato (e não só quando o token expira).
 */
async function resolveUser(token: string): Promise<JwtPayload | null> {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });
    if (!user) return null;
    return { userId: user.id, role: user.role as JwtPayload["role"] };
  } catch {
    return null;
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  const user = await resolveUser(authHeader.substring(7));
  if (!user) {
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  req.user = user;
  next();
}

/** Preenche req.user se houver token válido, sem bloquear requisições anônimas. */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const user = await resolveUser(authHeader.substring(7));
    if (user) req.user = user;
  }
  next();
}

export function authorize(allowedRoles: JwtPayload["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }

    next();
  };
}

/** Limitador simples em memória (por IP + rota) para endpoints sensíveis como login. */
export function rateLimit(maxAttempts: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
      return;
    }

    entry.count++;
    next();
  };
}

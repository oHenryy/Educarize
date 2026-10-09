import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { prisma } from "../config/database";
import { ACCESS_COOKIE } from "../utils/authCookies";

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
type ResolveResult = { user: JwtPayload } | { error: "missing" | "expired" | "invalid" };

export async function resolveUser(token: string | undefined): Promise<ResolveResult> {
  if (!token) return { error: "missing" };
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });
    if (!user) return { error: "invalid" };
    return { user: { userId: user.id, role: user.role as JwtPayload["role"] } };
  } catch (err) {
    return { error: err instanceof jwt.TokenExpiredError ? "expired" : "invalid" };
  }
}

const accessTokenFrom = (req: Request): string | undefined => req.cookies?.[ACCESS_COOKIE];

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const result = await resolveUser(accessTokenFrom(req));

  if ("error" in result) {
    // TOKEN_EXPIRED indica ao frontend que basta renovar a sessão (POST /auth/refresh).
    const body =
      result.error === "missing"
        ? { error: "Não autenticado", code: "UNAUTHENTICATED" }
        : result.error === "expired"
          ? { error: "Sessão expirada", code: "TOKEN_EXPIRED" }
          : { error: "Sessão inválida", code: "INVALID_TOKEN" };
    res.status(401).json(body);
    return;
  }

  req.user = result.user;
  next();
}

/** Preenche req.user se houver sessão válida, sem bloquear requisições anônimas. */
export async function optionalAuthenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const result = await resolveUser(accessTokenFrom(req));
  if ("user" in result) req.user = result.user;
  next();
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Proteção CSRF: requisições que alteram dados exigem o cabeçalho X-Requested-With.
 * Formulários e links de outros sites não conseguem enviá-lo, e o CORS restrito impede
 * que scripts de outras origens o enviem com os cookies da sessão.
 */
export function requireCsrfHeader(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method) || req.get("X-Requested-With") === "XMLHttpRequest") {
    next();
    return;
  }
  res.status(403).json({ error: "Requisição bloqueada (proteção CSRF)", code: "CSRF" });
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

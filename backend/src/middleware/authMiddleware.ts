import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { prisma } from "../config/database";
import { ACCESS_COOKIE } from "../utils/authCookies";
import { getRedis } from "../config/redis";
import type Redis from "ioredis";

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

// ---------- rate limit ----------

export type RateLimitHit = { count: number; resetAt: number };

/** Onde os contadores ficam: memória (uma instância) ou Redis (compartilhado entre instâncias). */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<RateLimitHit>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private hits = new Map<string, RateLimitHit>();
  private lastSweep = Date.now();

  async hit(key: string, windowMs: number): Promise<RateLimitHit> {
    const now = Date.now();
    this.sweep(now, windowMs);

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.hits.set(key, fresh);
      return fresh;
    }
    entry.count++;
    return entry;
  }

  /** Remove contadores expirados de tempos em tempos, para o mapa não crescer indefinidamente. */
  private sweep(now: number, windowMs: number) {
    if (now - this.lastSweep < windowMs) return;
    this.lastSweep = now;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}

/** Incrementa e define a expiração atomicamente (correto mesmo com várias instâncias ao mesmo tempo). */
const HIT_SCRIPT = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("PEXPIRE", KEYS[1], ARGV[1]) end
return { count, redis.call("PTTL", KEYS[1]) }
`;

export class RedisRateLimitStore implements RateLimitStore {
  constructor(private redis: Redis, private prefix = "ratelimit:") {}

  async hit(key: string, windowMs: number): Promise<RateLimitHit> {
    const [count, ttl] = (await this.redis.eval(HIT_SCRIPT, 1, this.prefix + key, windowMs)) as [number, number];
    return { count, resetAt: Date.now() + Math.max(ttl, 0) };
  }
}

/** Limita tentativas por IP + rota (login, cadastro, recuperação de senha). */
export function rateLimit(maxAttempts: number, windowMs: number, store?: RateLimitStore) {
  const resolveStore = (() => {
    let resolved: RateLimitStore | null = store ?? null;
    return () => {
      if (!resolved) {
        const redis = getRedis();
        resolved = redis ? new RedisRateLimitStore(redis) : new MemoryRateLimitStore();
      }
      return resolved;
    };
  })();

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;

    let hit: RateLimitHit;
    try {
      hit = await resolveStore().hit(key, windowMs);
    } catch (error) {
      // Falha do Redis não derruba o login: a requisição segue, e o erro fica registrado.
      console.error("Rate limit indisponível:", error);
      next();
      return;
    }

    if (hit.count > maxAttempts) {
      const retryAfter = Math.max(1, Math.ceil((hit.resetAt - Date.now()) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Muitas tentativas. Tente novamente em alguns minutos." });
      return;
    }

    next();
  };
}

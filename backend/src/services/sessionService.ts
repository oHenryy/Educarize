import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/database";
import { config } from "../config/env";
import { HttpError } from "../utils/httpError";

export type AccessTokenPayload = { userId: string; role: string };

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");
export const randomToken = () => crypto.randomBytes(48).toString("base64url");

export type SessionTokens = { accessToken: string; refreshToken: string };

export class SessionService {
  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, config.jwtSecret, { expiresIn: Math.floor(config.accessTokenTtlMs / 1000) });
  }

  /** Cria uma nova sessão (par access + refresh). Só o hash do refresh token é salvo. */
  async createSession(user: { id: string; role: string }): Promise<SessionTokens> {
    const refreshToken = randomToken();
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + config.refreshTokenTtlMs),
      },
    });
    return { accessToken: this.signAccessToken({ userId: user.id, role: user.role }), refreshToken };
  }

  /**
   * Troca um refresh token válido por um novo par (rotação).
   * Se um token já revogado for reapresentado, assume-se vazamento e todas as sessões do usuário caem.
   */
  async rotate(refreshToken: string | undefined) {
    if (!refreshToken) throw new HttpError(401, "Sessão expirada. Faça login novamente.");

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: { user: true },
    });

    if (!stored) throw new HttpError(401, "Sessão expirada. Faça login novamente.");

    if (stored.revokedAt) {
      await this.revokeAll(stored.userId);
      throw new HttpError(401, "Sessão inválida. Por segurança, todas as sessões foram encerradas.");
    }

    if (stored.expiresAt < new Date()) {
      throw new HttpError(401, "Sessão expirada. Faça login novamente.");
    }

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const tokens = await this.createSession(stored.user);
    return { tokens, user: stored.user };
  }

  async revoke(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

import { CookieOptions, Response } from "express";
import { config } from "../config/env";
import type { SessionTokens } from "../services/sessionService";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";
/** O refresh token só é enviado às rotas de autenticação, reduzindo sua exposição. */
const REFRESH_PATH = "/auth";

const baseOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: config.cookieSameSite,
});

export function setAuthCookies(res: Response, tokens: SessionTokens): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...baseOptions(), path: "/", maxAge: config.accessTokenTtlMs });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(),
    path: REFRESH_PATH,
    maxAge: config.refreshTokenTtlMs,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(), path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(), path: REFRESH_PATH });
}

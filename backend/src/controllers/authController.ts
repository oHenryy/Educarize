import { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { AuthService, LoginData, RegisterData } from "../services/authService";
import { SessionService } from "../services/sessionService";
import { prisma } from "../config/database";
import { sendError } from "../utils/httpError";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../utils/authCookies";

const authService = new AuthService();
const sessionService = new SessionService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { tokens, user } = await authService.register(req.body as RegisterData);
      setAuthCookies(res, tokens);
      res.status(201).json({ user });
    } catch (error) {
      sendError(res, error);
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { tokens, user } = await authService.login(req.body as LoginData);
      setAuthCookies(res, tokens);
      res.json({ user });
    } catch (error) {
      sendError(res, error);
    }
  }

  /** Renova a sessão a partir do refresh token (cookie), rotacionando-o. */
  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { tokens, user } = await sessionService.rotate(req.cookies?.[REFRESH_COOKIE]);
      setAuthCookies(res, tokens);
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
          emailVerifiedAt: user.emailVerifiedAt,
        },
      });
    } catch (error) {
      clearAuthCookies(res);
      sendError(res, error);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      await sessionService.revoke(req.cookies?.[REFRESH_COOKIE]);
      clearAuthCookies(res);
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      // E-mail só é exposto (e pesquisável) para administradores.
      const isAdmin = req.user!.role === "ADMIN";
      const { search, roles, limit } = req.query as unknown as {
        search?: string;
        roles?: Role[];
        limit?: number;
      };

      const users = await prisma.user.findMany({
        where: {
          id: { not: req.user!.userId },
          ...(roles && { role: { in: roles } }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              ...(isAdmin ? [{ email: { contains: search, mode: "insensitive" as const } }] : []),
            ],
          }),
        },
        select: {
          id: true,
          name: true,
          email: isAdmin,
          avatarUrl: true,
          role: true,
        },
        orderBy: { name: "asc" },
        take: limit ?? 20,
      });
      res.json(users);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      res.json(await authService.getCurrentUser(req.user!.userId));
    } catch (error) {
      sendError(res, error);
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const tokens = await authService.changePassword(req.user!.userId, currentPassword, newPassword);
      // As outras sessões foram encerradas; este dispositivo continua logado com uma sessão nova.
      setAuthCookies(res, tokens);
      res.json({ message: "Senha alterada com sucesso. As outras sessões foram encerradas." });
    } catch (error) {
      sendError(res, error);
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({ message: "Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha." });
    } catch (error) {
      sendError(res, error);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      clearAuthCookies(res);
      res.json({ message: "Senha redefinida com sucesso. Faça login com a nova senha." });
    } catch (error) {
      sendError(res, error);
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      await authService.verifyEmail(req.body.token);
      res.json({ message: "E-mail confirmado com sucesso." });
    } catch (error) {
      sendError(res, error);
    }
  }

  async resendVerification(req: Request, res: Response): Promise<void> {
    try {
      await authService.resendVerification(req.user!.userId);
      res.json({ message: "Enviamos um novo link de confirmação para o seu e-mail." });
    } catch (error) {
      sendError(res, error);
    }
  }
}

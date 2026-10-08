import { Request, Response } from "express";
import { AuthService, RegisterData, LoginData } from "../services/authService";
import { prisma } from "../config/database";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role } = req.body as RegisterData;

      if (!name || !email || !password) {
        res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
        return;
      }

      const result = await authService.register({ name, email, password, role });
      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === "Email já cadastrado") {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      // E-mail só é exposto para administradores.
      const isAdmin = req.user!.role === "ADMIN";
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: isAdmin,
          avatarUrl: true,
          role: true,
        },
        orderBy: { name: "asc" },
      });
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar usuários" });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginData;

      if (!email || !password) {
        res.status(400).json({ error: "Email e senha são obrigatórios" });
        return;
      }

      const result = await authService.login({ email, password });
      res.json(result);
    } catch (error: any) {
      if (error.message === "Credenciais inválidas") {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await authService.getCurrentUser(userId);
      res.json(result);
    } catch (error: any) {
      if (error.message === "Usuário não encontrado") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: "Senha atual e nova senha são obrigatórias" });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: "A nova senha deve ter pelo menos 6 caracteres" });
        return;
      }

      await authService.changePassword(userId, currentPassword, newPassword);
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao alterar senha" });
    }
  }
}


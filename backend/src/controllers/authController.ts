import { Request, Response } from "express";
import { AuthService, RegisterData, LoginData } from "../services/authService";

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
}


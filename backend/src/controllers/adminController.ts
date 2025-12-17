import { Request, Response } from "express";
import { AdminService } from "../services/adminService";

const adminService = new AdminService();

export const adminController = {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar estatísticas" });
    }
  },

  async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await adminService.getAllUsers(page, limit, search);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar usuários" });
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserById(id);
      res.json(user);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Usuário não encontrado" });
    }
  },

  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: "Papel é obrigatório" });
      }

      const updated = await adminService.updateUserRole(id, role);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao atualizar papel do usuário" });
    }
  },

  async resetUserPassword(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: "Nova senha é obrigatória" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      }

      const result = await adminService.resetUserPassword(id, newPassword);
      res.json({ message: "Senha resetada com sucesso", user: result });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao resetar senha" });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteUser(id);
      res.json(result);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Erro ao deletar usuário" });
    }
  },
};


import { Request, Response } from "express";
import { AdminService } from "../services/adminService";
import { sendError } from "../utils/httpError";

const adminService = new AdminService();

export const adminController = {
  async getDashboardStats(req: Request, res: Response) {
    try {
      const stats = await adminService.getDashboardStats();
      res.json(stats);
    } catch (error) {
      sendError(res, error);
    }
  },

  async getAllUsers(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;

      const result = await adminService.getAllUsers(page, limit, search);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await adminService.getUserById(id);
      res.json(user);
    } catch (error) {
      sendError(res, error);
    }
  },

  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: "Papel é obrigatório" });
      }

      const updated = await adminService.updateUserRole(id, role, req.user!.userId);
      res.json(updated);
    } catch (error) {
      sendError(res, error);
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
    } catch (error) {
      sendError(res, error);
    }
  },

  async transferContent(req: Request, res: Response) {
    try {
      const { targetUserId } = req.body;
      if (!targetUserId) {
        return res.status(400).json({ error: "targetUserId é obrigatório" });
      }

      const result = await adminService.transferContent(req.params.id, targetUserId, req.user!.userId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteUser(id, req.user!.userId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  },
};


import { Request, Response } from "express";
import { InstructorService } from "../services/instructorService";

const instructorService = new InstructorService();

export class InstructorController {
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await instructorService.getDashboardStats(userId);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar estatísticas" });
    }
  }
}


import { Request, Response } from "express";
import { InstructorService } from "../services/instructorService";
import { sendError } from "../utils/httpError";

const instructorService = new InstructorService();

export class InstructorController {
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const stats = await instructorService.getDashboardStats(userId);
      res.json(stats);
    } catch (error) {
      sendError(res, error);
    }
  }
}


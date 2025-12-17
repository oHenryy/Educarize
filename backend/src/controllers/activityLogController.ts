import { Request, Response } from "express";
import { ActivityLogService } from "../services/activityLogService";

const activityLogService = new ActivityLogService();

export const activityLogController = {
  async getLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const action = req.query.action as string | undefined;
      const resourceType = req.query.resourceType as string | undefined;
      const userId = req.query.userId as string | undefined;

      const result = await activityLogService.getLogs(page, limit, {
        action: action as any,
        resourceType: resourceType as any,
        userId,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar logs" });
    }
  },

  async getLogById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const log = await activityLogService.getLogById(id);
      if (!log) {
        return res.status(404).json({ error: "Log não encontrado" });
      }
      res.json(log);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Erro ao buscar log" });
    }
  },
};


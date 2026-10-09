import { Request, Response } from "express";
import { ProgressService } from "../services/progressService";
import { sendError } from "../utils/httpError";

const progressService = new ProgressService();

export class ProgressController {
  async markCompleted(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId } = req.body;
      if (!lessonId) {
        res.status(400).json({ error: "lessonId é obrigatório" });
        return;
      }

      const progress = await progressService.markLessonCompleted(
        req.user!.userId,
        lessonId
      );
      res.json(progress);
    } catch (error) {
      sendError(res, error);
    }
  }

  async markIncomplete(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId } = req.body;
      if (!lessonId) {
        res.status(400).json({ error: "lessonId é obrigatório" });
        return;
      }

      const progress = await progressService.markLessonIncomplete(
        req.user!.userId,
        lessonId
      );
      res.json(progress || { message: "Progresso removido" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getCourseProgress(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const progress = await progressService.getCourseProgress(
        req.user!.userId,
        courseId
      );
      res.json(progress);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getLessonProgress(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId } = req.params;
      const progress = await progressService.getLessonProgress(
        req.user!.userId,
        lessonId
      );
      res.json(progress || { completed: false });
    } catch (error) {
      sendError(res, error);
    }
  }
}


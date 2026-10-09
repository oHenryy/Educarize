import { Request, Response } from "express";
import { CommentService } from "../services/commentService";
import { sendError } from "../utils/httpError";

const commentService = new CommentService();

export class CommentController {
  async listByLesson(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId } = req.params;
      const comments = await commentService.listByLesson(lessonId, req.user!);
      res.json(comments);
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId, content, parentId } = req.body;
      if (!lessonId || !content) {
        res.status(400).json({ error: "lessonId e content são obrigatórios" });
        return;
      }

      const comment = await commentService.create(
        lessonId,
        req.user!,
        content,
        parentId
      );
      res.status(201).json(comment);
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { content } = req.body;
      if (!content) {
        res.status(400).json({ error: "content é obrigatório" });
        return;
      }

      const updated = await commentService.update(
        id,
        req.user!.userId,
        content
      );
      res.json(updated);
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await commentService.delete(id, req.user!.userId, req.user!.role);
      res.json({ message: "Comentário deletado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }
}


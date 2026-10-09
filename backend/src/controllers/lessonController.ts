import { Request, Response } from "express";
import { LessonService } from "../services/lessonService";
import { sendError } from "../utils/httpError";

const lessonService = new LessonService();

export class LessonController {
  async listByModule(req: Request, res: Response): Promise<void> {
    try {
      const lessons = await lessonService.listByModule(req.params.moduleId, req.user!);
      res.json(lessons);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const lesson = await lessonService.getById(req.params.id, req.user!);
      res.json(lesson);
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, videoUrl, durationMinutes, order, moduleId } = req.body;
      if (!title || !moduleId) {
        res.status(400).json({ error: "Título e moduleId são obrigatórios" });
        return;
      }
      const lesson = await lessonService.create(
        { title, description, videoUrl, durationMinutes, order, moduleId },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(lesson);
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, videoUrl, durationMinutes, order } = req.body;
      const updated = await lessonService.update(
        req.params.id,
        { title, description, videoUrl, durationMinutes, order },
        req.user!.userId,
        req.user!.role
      );
      res.json(updated);
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await lessonService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json({ message: "Aula deletada com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async addAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, fileUrl, fileType, fileSize, category, order, thumbnailUrl } = req.body;
      if (!name || !fileUrl || !fileType) {
        res.status(400).json({ error: "Nome, fileUrl e fileType são obrigatórios" });
        return;
      }
      const attachment = await lessonService.addAttachment(
        req.params.id,
        { name, description, fileUrl, fileType, fileSize, category, order, thumbnailUrl },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(attachment);
    } catch (error) {
      sendError(res, error);
    }
  }

  async updateAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, fileUrl, fileType, fileSize, category, order, thumbnailUrl } = req.body;
      const attachment = await lessonService.updateAttachment(
        req.params.attachmentId,
        { name, description, fileUrl, fileType, fileSize, category, order, thumbnailUrl },
        req.user!.userId,
        req.user!.role
      );
      res.json(attachment);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getAttachments(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;
      const attachments = await lessonService.getAttachmentsByLesson(
        req.params.id,
        req.user!,
        category as string | undefined
      );
      res.json(attachments);
    } catch (error) {
      sendError(res, error);
    }
  }

  async downloadAttachment(req: Request, res: Response): Promise<void> {
    try {
      const attachmentId = req.params.attachmentId;
      await lessonService.incrementAttachmentDownload(attachmentId, req.user!);
      res.json({ message: "Download registrado" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      await lessonService.deleteAttachment(req.params.attachmentId, req.user!.userId, req.user!.role);
      res.json({ message: "Anexo deletado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }
}


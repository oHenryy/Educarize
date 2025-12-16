import { Request, Response } from "express";
import { LessonService } from "../services/lessonService";

const lessonService = new LessonService();

export class LessonController {
  async listByModule(req: Request, res: Response): Promise<void> {
    try {
      const lessons = await lessonService.listByModule(req.params.moduleId);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const lesson = await lessonService.getById(req.params.id);
      res.json(lesson);
    } catch (error: any) {
      if (error.message === "Aula não encontrada") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
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
    } catch (error: any) {
      if (error.message === "Módulo não encontrado") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
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
    } catch (error: any) {
      if (error.message === "Aula não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await lessonService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json({ message: "Aula deletada com sucesso" });
    } catch (error: any) {
      if (error.message === "Aula não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async addAttachment(req: Request, res: Response): Promise<void> {
    try {
      const { name, fileUrl, fileType, fileSize } = req.body;
      if (!name || !fileUrl || !fileType) {
        res.status(400).json({ error: "Nome, fileUrl e fileType são obrigatórios" });
        return;
      }
      const attachment = await lessonService.addAttachment(
        req.params.id,
        { name, fileUrl, fileType, fileSize },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(attachment);
    } catch (error: any) {
      if (error.message === "Aula não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteAttachment(req: Request, res: Response): Promise<void> {
    try {
      await lessonService.deleteAttachment(req.params.attachmentId, req.user!.userId, req.user!.role);
      res.json({ message: "Anexo deletado com sucesso" });
    } catch (error: any) {
      if (error.message === "Anexo não encontrado") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}


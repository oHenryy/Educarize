import { Request, Response } from "express";
import { ModuleService } from "../services/moduleService";
import { sendError } from "../utils/httpError";

const moduleService = new ModuleService();

export class ModuleController {
  async listByCourse(req: Request, res: Response): Promise<void> {
    try {
      const modules = await moduleService.listByCourse(req.params.courseId, req.user!);
      res.json(modules);
    } catch (error: any) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, order, courseId } = req.body;
      if (!title || !courseId) {
        res.status(400).json({ error: "Título e courseId são obrigatórios" });
        return;
      }
      const module = await moduleService.create(
        { title, description, order, courseId },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(module);
    } catch (error: any) {
      if (error.message === "Curso não encontrado") {
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
      const { title, description, order } = req.body;
      const updated = await moduleService.update(
        req.params.id,
        { title, description, order },
        req.user!.userId,
        req.user!.role
      );
      res.json(updated);
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

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await moduleService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json({ message: "Módulo deletado com sucesso" });
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
}


import { Request, Response } from "express";
import { ModuleService } from "../services/moduleService";
import { sendError } from "../utils/httpError";

const moduleService = new ModuleService();

export class ModuleController {
  async listByCourse(req: Request, res: Response): Promise<void> {
    try {
      const modules = await moduleService.listByCourse(req.params.courseId, req.user!);
      res.json(modules);
    } catch (error) {
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
    } catch (error) {
      sendError(res, error);
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
    } catch (error) {
      sendError(res, error);
    }
  }

  async reorder(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, moduleIds } = req.body;
      const modules = await moduleService.reorder(courseId, moduleIds, req.user!.userId, req.user!.role);
      res.json(modules);
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await moduleService.delete(req.params.id, req.user!.userId, req.user!.role);
      res.json({ message: "Módulo deletado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }
}


import { Request, Response } from "express";
import { CategoryService } from "../services/categoryService";
import { sendError } from "../utils/httpError";

const categoryService = new CategoryService();

export class CategoryController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await categoryService.list();
      res.json(categories);
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { name, description } = req.body;
      if (!name) {
        res.status(400).json({ error: "Nome é obrigatório" });
        return;
      }
      const category = await categoryService.create(name, description);
      res.status(201).json(category);
    } catch (error) {
      sendError(res, error);
    }
  }
}


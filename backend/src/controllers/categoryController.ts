import { Request, Response } from "express";
import { CategoryService } from "../services/categoryService";

const categoryService = new CategoryService();

export class CategoryController {
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const categories = await categoryService.list();
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
    } catch (error: any) {
      if (error.message === "Categoria já existe") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}


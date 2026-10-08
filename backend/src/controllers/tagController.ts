import { Request, Response } from "express";
import { TagService } from "../services/tagService";

const tagService = new TagService();

export class TagController {
  async createTag(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: "Nome da tag é obrigatório" });
        return;
      }

      const tag = await tagService.createTag(name);
      res.status(201).json(tag);
    } catch (error: any) {
      if (error.message === "Tag já existe") {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getAllTags(req: Request, res: Response): Promise<void> {
    try {
      const tags = await tagService.getAllTags();
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPopularTags(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tags = await tagService.getPopularTags(limit);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async addTagToCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const { tagName } = req.body;

      if (!tagName || !tagName.trim()) {
        res.status(400).json({ error: "Nome da tag é obrigatório" });
        return;
      }

      const courseTag = await tagService.addTagToCourse(courseId, tagName, req.user!);
      res.status(201).json(courseTag);
    } catch (error: any) {
      if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else if (error.message === "Curso não encontrado" || error.message === "Tag já está associada a este curso") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async removeTagFromCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, tagId } = req.params;

      const result = await tagService.removeTagFromCourse(courseId, tagId, req.user!);
      res.json(result);
    } catch (error: any) {
      if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else if (error.message === "Tag não está associada a este curso" || error.message === "Curso não encontrado") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getCourseTags(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const tags = await tagService.getCourseTags(courseId);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCoursesByTag(req: Request, res: Response): Promise<void> {
    try {
      const { tagId } = req.params;
      const courses = await tagService.getCoursesByTag(tagId);
      res.json(courses);
    } catch (error: any) {
      if (error.message === "Tag não encontrada") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}


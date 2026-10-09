import { Request, Response } from "express";
import { TagService } from "../services/tagService";
import { sendError } from "../utils/httpError";

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
    } catch (error) {
      sendError(res, error);
    }
  }

  async getAllTags(req: Request, res: Response): Promise<void> {
    try {
      const tags = await tagService.getAllTags();
      res.json(tags);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getPopularTags(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tags = await tagService.getPopularTags(limit);
      res.json(tags);
    } catch (error) {
      sendError(res, error);
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
    } catch (error) {
      sendError(res, error);
    }
  }

  async removeTagFromCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, tagId } = req.params;

      const result = await tagService.removeTagFromCourse(courseId, tagId, req.user!);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getCourseTags(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const tags = await tagService.getCourseTags(courseId);
      res.json(tags);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getCoursesByTag(req: Request, res: Response): Promise<void> {
    try {
      const { tagId } = req.params;
      const courses = await tagService.getCoursesByTag(tagId);
      res.json(courses);
    } catch (error) {
      sendError(res, error);
    }
  }
}


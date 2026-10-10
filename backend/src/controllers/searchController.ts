import { Request, Response } from "express";
import { SearchService } from "../services/searchService";
import { sendError } from "../utils/httpError";
import { queryString } from "../utils";

const searchService = new SearchService();

export class SearchController {
  async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        categoryId,
        difficulty,
        status,
        tags,
        minRating,
        instructorId,
        page,
        limit,
      } = req.query;

      const filters: any = {};
      if (queryString(query)) filters.query = queryString(query);
      if (categoryId) filters.categoryId = categoryId as string;
      if (difficulty) filters.difficulty = difficulty as string;
      // Filtrar por status diferente de PUBLISHED é exclusivo de administradores.
      if (status && req.user?.role === "ADMIN") filters.status = status as string;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags as string];
      }
      if (minRating) filters.minRating = parseFloat(minRating as string);
      if (instructorId) filters.instructorId = instructorId as string;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const result = await searchService.advancedSearch(filters, pageNum, limitNum);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  }

  async searchLessons(req: Request, res: Response): Promise<void> {
    try {
      const query = queryString(req.query.query);
      const { courseId } = req.query;

      if (!query) {
        res.status(400).json({ error: "Query de busca é obrigatória" });
        return;
      }

      const lessons = await searchService.searchLessons(
        query as string,
        courseId as string | undefined
      );
      res.json(lessons);
    } catch (error) {
      sendError(res, error);
    }
  }

  async searchNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const query = queryString(req.query.query);

      if (!query) {
        res.status(400).json({ error: "Query de busca é obrigatória" });
        return;
      }

      const notes = await searchService.searchNotes(query as string, userId);
      res.json(notes);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getPopularTags(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const tags = await searchService.getPopularTags(limit);
      res.json(tags);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getSearchSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const query = queryString(req.query.query);

      if (!query || query.length < 2) {
        res.json({ courses: [], tags: [] });
        return;
      }

      const suggestions = await searchService.getSearchSuggestions(query as string);
      res.json(suggestions);
    } catch (error) {
      sendError(res, error);
    }
  }
}


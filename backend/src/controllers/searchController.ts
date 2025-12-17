import { Request, Response } from "express";
import { SearchService } from "../services/searchService";

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
        hasCertificate,
        page,
        limit,
      } = req.query;

      const filters: any = {};
      if (query) filters.query = query as string;
      if (categoryId) filters.categoryId = categoryId as string;
      if (difficulty) filters.difficulty = difficulty as string;
      if (status) filters.status = status as string;
      if (tags) {
        filters.tags = Array.isArray(tags) ? tags : [tags as string];
      }
      if (minRating) filters.minRating = parseFloat(minRating as string);
      if (instructorId) filters.instructorId = instructorId as string;
      if (hasCertificate === "true") filters.hasCertificate = true;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;

      const result = await searchService.advancedSearch(filters, pageNum, limitNum);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao realizar busca" });
    }
  }

  async searchLessons(req: Request, res: Response): Promise<void> {
    try {
      const { query, courseId } = req.query;

      if (!query) {
        res.status(400).json({ error: "Query de busca é obrigatória" });
        return;
      }

      const lessons = await searchService.searchLessons(
        query as string,
        courseId as string | undefined
      );
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar aulas" });
    }
  }

  async searchNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { query } = req.query;

      if (!query) {
        res.status(400).json({ error: "Query de busca é obrigatória" });
        return;
      }

      const notes = await searchService.searchNotes(query as string, userId);
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar anotações" });
    }
  }

  async getPopularTags(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const tags = await searchService.getPopularTags(limit);
      res.json(tags);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar tags populares" });
    }
  }

  async getSearchSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { query } = req.query;

      if (!query || (query as string).length < 2) {
        res.json({ courses: [], tags: [] });
        return;
      }

      const suggestions = await searchService.getSearchSuggestions(query as string);
      res.json(suggestions);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar sugestões" });
    }
  }
}


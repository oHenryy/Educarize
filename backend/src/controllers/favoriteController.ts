import { Request, Response } from "express";
import { FavoriteService } from "../services/favoriteService";

const favoriteService = new FavoriteService();

export class FavoriteController {
  async addFavorite(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { courseId } = req.body;

      if (!courseId) {
        res.status(400).json({ error: "ID do curso é obrigatório" });
        return;
      }

      const favorite = await favoriteService.addFavorite(userId, courseId);
      res.status(201).json(favorite);
    } catch (error: any) {
      if (error.message === "Curso não encontrado" || error.message === "Curso já está nos favoritos") {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async removeFavorite(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { courseId } = req.params;

      const result = await favoriteService.removeFavorite(userId, courseId);
      res.json(result);
    } catch (error: any) {
      if (error.message === "Favorito não encontrado") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getMyFavorites(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const favorites = await favoriteService.getMyFavorites(userId);
      res.json(favorites);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async isFavorite(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { courseId } = req.params;

      const isFav = await favoriteService.isFavorite(userId, courseId);
      res.json({ isFavorite: isFav });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}


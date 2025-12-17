import { Request, Response } from "express";
import { ReviewService } from "../services/reviewService";

const reviewService = new ReviewService();

export class ReviewController {
  async createReview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { courseId, rating, comment } = req.body;

      if (!courseId || !rating) {
        res.status(400).json({ error: "ID do curso e avaliação são obrigatórios" });
        return;
      }

      const review = await reviewService.createReview(userId, courseId, rating, comment);
      res.status(201).json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateReview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { rating, comment } = req.body;

      const review = await reviewService.updateReview(id, userId, rating, comment);
      res.json(review);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteReview(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await reviewService.deleteReview(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCourseReviews(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await reviewService.getCourseReviews(courseId, page, limit);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMyReviews(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const reviews = await reviewService.getMyReviews(userId);
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}


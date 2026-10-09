import { Request, Response } from "express";
import { LearningPathService } from "../services/learningPathService";
import { sendError } from "../utils/httpError";

const learningPathService = new LearningPathService();

export class LearningPathController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, instructorId, difficulty } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (instructorId) filters.instructorId = instructorId as string;
      if (difficulty) filters.difficulty = difficulty as string;

      const learningPaths = await learningPathService.listLearningPaths(filters, req.user);
      res.json(learningPaths);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const learningPath = await learningPathService.getLearningPathById(req.params.id, req.user);
      res.json(learningPath);
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, coverImageUrl, difficulty, estimatedHours, status } = req.body;
      if (!title) {
        res.status(400).json({ error: "Título é obrigatório" });
        return;
      }

      const learningPath = await learningPathService.createLearningPath(
        {
          title,
          description,
          coverImageUrl,
          difficulty,
          estimatedHours,
          instructorId: req.user!.userId,
          status,
        },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(learningPath);
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, coverImageUrl, difficulty, estimatedHours, status } = req.body;
      const learningPath = await learningPathService.updateLearningPath(
        req.params.id,
        { title, description, coverImageUrl, difficulty, estimatedHours, status },
        req.user!.userId,
        req.user!.role
      );
      res.json(learningPath);
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await learningPathService.deleteLearningPath(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }

  async addCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId, order, isRequired } = req.body;
      if (!courseId) {
        res.status(400).json({ error: "courseId é obrigatório" });
        return;
      }

      const pathCourse = await learningPathService.addCourseToPath(
        req.params.id,
        courseId,
        req.user!.userId,
        req.user!.role,
        order,
        isRequired
      );
      res.status(201).json(pathCourse);
    } catch (error) {
      sendError(res, error);
    }
  }

  async removeCourse(req: Request, res: Response): Promise<void> {
    try {
      const courseId = req.params.courseId || req.body?.courseId;
      if (!courseId) {
        res.status(400).json({ error: "courseId é obrigatório" });
        return;
      }

      await learningPathService.removeCourseFromPath(
        req.params.id,
        courseId,
        req.user!.userId,
        req.user!.role
      );
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }

  async reorderCourses(req: Request, res: Response): Promise<void> {
    try {
      const { courseIds } = req.body;
      if (!Array.isArray(courseIds) || courseIds.some((c) => typeof c !== "string")) {
        res.status(400).json({ error: "courseIds deve ser uma lista de IDs de curso" });
        return;
      }

      const learningPath = await learningPathService.reorderCourses(
        req.params.id,
        courseIds,
        req.user!.userId,
        req.user!.role
      );
      res.json(learningPath);
    } catch (error) {
      sendError(res, error);
    }
  }

  async enroll(req: Request, res: Response): Promise<void> {
    try {
      const enrollment = await learningPathService.enrollInPath(
        req.params.id,
        req.user!.userId
      );
      res.status(201).json(enrollment);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const progress = await learningPathService.getUserProgress(
        req.params.id,
        req.user!.userId
      );
      res.json(progress);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getUserPaths(req: Request, res: Response): Promise<void> {
    try {
      const paths = await learningPathService.getUserLearningPaths(req.user!.userId);
      res.json(paths);
    } catch (error) {
      sendError(res, error);
    }
  }
}


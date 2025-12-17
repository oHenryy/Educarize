import { Request, Response } from "express";
import { LearningPathService } from "../services/learningPathService";

const learningPathService = new LearningPathService();

export class LearningPathController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, instructorId, difficulty } = req.query;
      const filters: any = {};
      if (status) filters.status = status as string;
      if (instructorId) filters.instructorId = instructorId as string;
      if (difficulty) filters.difficulty = difficulty as string;

      const learningPaths = await learningPathService.listLearningPaths(filters);
      res.json(learningPaths);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao listar trilhas" });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const learningPath = await learningPathService.getLearningPathById(req.params.id);
      res.json(learningPath);
    } catch (error: any) {
      if (error.message === "Trilha de aprendizado não encontrada") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao buscar trilha" });
      }
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
    } catch (error: any) {
      if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao criar trilha" });
      }
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
    } catch (error: any) {
      if (error.message === "Trilha de aprendizado não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao atualizar trilha" });
      }
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
    } catch (error: any) {
      if (error.message === "Trilha de aprendizado não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao deletar trilha" });
      }
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
        order,
        isRequired,
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(pathCourse);
    } catch (error: any) {
      if (error.message === "Trilha de aprendizado não encontrada" || error.message === "Curso não encontrado") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao adicionar curso" });
      }
    }
  }

  async removeCourse(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.body;
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
    } catch (error: any) {
      if (error.message === "Trilha de aprendizado não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao remover curso" });
      }
    }
  }

  async enroll(req: Request, res: Response): Promise<void> {
    try {
      const enrollment = await learningPathService.enrollInPath(
        req.params.id,
        req.user!.userId
      );
      res.status(201).json(enrollment);
    } catch (error: any) {
      if (error.message === "Trilha de aprendizado não encontrada" || error.message === "Trilha não está publicada") {
        res.status(404).json({ error: error.message });
      } else if (error.message === "Você já está matriculado nesta trilha") {
        res.status(409).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao se matricular na trilha" });
      }
    }
  }

  async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const progress = await learningPathService.getUserProgress(
        req.params.id,
        req.user!.userId
      );
      res.json(progress);
    } catch (error: any) {
      if (error.message === "Você não está matriculado nesta trilha") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao buscar progresso" });
      }
    }
  }

  async getUserPaths(req: Request, res: Response): Promise<void> {
    try {
      const paths = await learningPathService.getUserLearningPaths(req.user!.userId);
      res.json(paths);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar trilhas do usuário" });
    }
  }
}


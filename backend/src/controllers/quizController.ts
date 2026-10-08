import { Request, Response } from "express";
import { QuizService } from "../services/quizService";
import { HttpError, sendError } from "../utils/httpError";

const quizService = new QuizService();

export class QuizController {
  async getByModule(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const quiz = await quizService.getByModule(moduleId, req.user!);
      res.json(quiz);
    } catch (error: any) {
      if (error instanceof HttpError) {
        sendError(res, error);
      } else if (error.message === "Quiz não encontrado") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId, title, description, passingScore } = req.body;
      if (!moduleId || !title) {
        res.status(400).json({ error: "moduleId e title são obrigatórios" });
        return;
      }

      const quiz = await quizService.create(
        moduleId,
        { title, description, passingScore },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(quiz);
    } catch (error: any) {
      if (error instanceof HttpError) {
        sendError(res, error);
      } else if (error.message === "Módulo não encontrado" || error.message === "Já existe um quiz para este módulo") {
        res.status(400).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, passingScore } = req.body;

      const updated = await quizService.update(
        id,
        { title, description, passingScore },
        req.user!.userId,
        req.user!.role
      );
      res.json(updated);
    } catch (error: any) {
      if (error instanceof HttpError) {
        sendError(res, error);
      } else if (error.message === "Quiz não encontrado") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await quizService.delete(id, req.user!.userId, req.user!.role);
      res.json({ message: "Quiz deletado com sucesso" });
    } catch (error: any) {
      if (error.message === "Quiz não encontrado") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async addQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { quizId, question, options, correctAnswer, order } = req.body;
      if (!quizId || !question || !options || correctAnswer === undefined) {
        res.status(400).json({ error: "quizId, question, options e correctAnswer são obrigatórios" });
        return;
      }

      if (!Array.isArray(options) || options.length < 2) {
        res.status(400).json({ error: "options deve ser um array com pelo menos 2 opções" });
        return;
      }

      const questionData = await quizService.addQuestion(
        quizId,
        { question, options, correctAnswer, order },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(questionData);
    } catch (error: any) {
      if (error.message === "Quiz não encontrado" || error.message === "Resposta correta inválida") {
        res.status(400).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { question, options, correctAnswer, order } = req.body;

      if (options && !Array.isArray(options)) {
        res.status(400).json({ error: "options deve ser um array" });
        return;
      }

      const updated = await quizService.updateQuestion(
        id,
        { question, options, correctAnswer, order },
        req.user!.userId,
        req.user!.role
      );
      res.json(updated);
    } catch (error: any) {
      if (error.message === "Questão não encontrada" || error.message === "Resposta correta inválida") {
        res.status(400).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await quizService.deleteQuestion(id, req.user!.userId, req.user!.role);
      res.json({ message: "Questão deletada com sucesso" });
    } catch (error: any) {
      if (error.message === "Questão não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("Sem permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async submitAttempt(req: Request, res: Response): Promise<void> {
    try {
      const { quizId, answers } = req.body;
      if (!quizId || !answers) {
        res.status(400).json({ error: "quizId e answers são obrigatórios" });
        return;
      }

      const attempt = await quizService.submitAttempt(
        quizId,
        req.user!.userId,
        answers,
        req.user!
      );
      res.json(attempt);
    } catch (error: any) {
      if (error instanceof HttpError) {
        sendError(res, error);
      } else if (error.message === "Quiz não encontrado") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getAttempts(req: Request, res: Response): Promise<void> {
    try {
      const { quizId } = req.params;
      const attempts = await quizService.getAttempts(quizId, req.user!.userId);
      res.json(attempts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}


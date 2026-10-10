import { Request, Response } from "express";
import { QuizService } from "../services/quizService";
import { sendError } from "../utils/httpError";

const quizService = new QuizService();

export class QuizController {
  async getByModule(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.params;
      const quiz = await quizService.getByModule(moduleId, req.user!);
      res.json(quiz);
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId, title, description, passingScore, maxAttempts, shuffleQuestions, shuffleOptions } = req.body;
      if (!moduleId || !title) {
        res.status(400).json({ error: "moduleId e title são obrigatórios" });
        return;
      }

      const quiz = await quizService.create(
        moduleId,
        { title, description, passingScore, maxAttempts, shuffleQuestions, shuffleOptions },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(quiz);
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { title, description, passingScore, maxAttempts, shuffleQuestions, shuffleOptions } = req.body;

      const updated = await quizService.update(
        id,
        { title, description, passingScore, maxAttempts, shuffleQuestions, shuffleOptions },
        req.user!.userId,
        req.user!.role
      );
      res.json(updated);
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await quizService.delete(id, req.user!.userId, req.user!.role);
      res.json({ message: "Quiz deletado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async addQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { quizId, question, options, correctAnswer, explanation, order } = req.body;
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
        { question, options, correctAnswer, explanation, order },
        req.user!.userId,
        req.user!.role
      );
      res.status(201).json(questionData);
    } catch (error) {
      sendError(res, error);
    }
  }

  async updateQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { question, options, correctAnswer, explanation, order } = req.body;

      if (options && !Array.isArray(options)) {
        res.status(400).json({ error: "options deve ser um array" });
        return;
      }

      const updated = await quizService.updateQuestion(
        id,
        { question, options, correctAnswer, explanation, order },
        req.user!.userId,
        req.user!.role
      );
      res.json(updated);
    } catch (error) {
      sendError(res, error);
    }
  }

  async deleteQuestion(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await quizService.deleteQuestion(id, req.user!.userId, req.user!.role);
      res.json({ message: "Questão deletada com sucesso" });
    } catch (error) {
      sendError(res, error);
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
    } catch (error) {
      sendError(res, error);
    }
  }

  async getAttempts(req: Request, res: Response): Promise<void> {
    try {
      const { quizId } = req.params;
      const attempts = await quizService.getAttempts(quizId, req.user!.userId);
      res.json(attempts);
    } catch (error) {
      sendError(res, error);
    }
  }
}


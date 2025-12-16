import { Request, Response } from "express";
import { EnrollmentService } from "../services/enrollmentService";

const enrollmentService = new EnrollmentService();

export class EnrollmentController {
  async enroll(req: Request, res: Response): Promise<void> {
    try {
      const { courseId } = req.body;
      if (!courseId) {
        res.status(400).json({ error: "courseId é obrigatório" });
        return;
      }
      const enrollment = await enrollmentService.enroll(req.user!.userId, courseId);
      res.status(201).json(enrollment);
    } catch (error: any) {
      if (error.message === "Curso não encontrado") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("já está matriculado") || error.message.includes("não está publicado")) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }

  async getMyEnrollments(req: Request, res: Response): Promise<void> {
    try {
      const enrollments = await enrollmentService.getMyEnrollments(req.user!.userId);
      res.json(enrollments);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      await enrollmentService.cancelEnrollment(req.user!.userId, req.params.courseId);
      res.json({ message: "Matrícula cancelada com sucesso" });
    } catch (error: any) {
      if (error.message === "Matrícula não encontrada") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
}


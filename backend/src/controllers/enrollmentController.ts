import { Request, Response } from "express";
import { EnrollmentService } from "../services/enrollmentService";
import { sendError } from "../utils/httpError";

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
    } catch (error) {
      sendError(res, error);
    }
  }

  async getMyEnrollments(req: Request, res: Response): Promise<void> {
    try {
      const enrollments = await enrollmentService.getMyEnrollments(req.user!.userId);
      res.json(enrollments);
    } catch (error) {
      sendError(res, error);
    }
  }

  async cancel(req: Request, res: Response): Promise<void> {
    try {
      await enrollmentService.cancelEnrollment(req.user!.userId, req.params.courseId);
      res.json({ message: "Matrícula cancelada com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }
}


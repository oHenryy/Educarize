import { Request, Response } from "express";
import { CourseService, CreateCourseData, UpdateCourseData } from "../services/courseService";
import { sendError } from "../utils/httpError";

const courseService = new CourseService();

export class CourseController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, difficulty, status, search, instructorId } = req.query;
      const courses = await courseService.listCourses(
        {
          categoryId: categoryId as string,
          difficulty: difficulty as string,
          status: status as string,
          search: search as string,
          instructorId: instructorId as string,
        },
        req.user!
      );
      res.json(courses);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const course = await courseService.getCourseById(req.params.id, req.user!);
      res.json(course);
    } catch (error) {
      sendError(res, error);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        coverImageUrl,
        durationHours,
        difficulty,
        categoryId,
      } = req.body;

      if (!title) {
        res.status(400).json({ error: "Título é obrigatório" });
        return;
      }

      const data: CreateCourseData = {
        title,
        description,
        coverImageUrl,
        durationHours,
        difficulty,
        categoryId,
        instructorId: req.user!.userId,
      };

      const course = await courseService.createCourse(data);
      res.status(201).json(course);
    } catch (error) {
      sendError(res, error);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const {
        title,
        description,
        coverImageUrl,
        durationHours,
        difficulty,
        categoryId,
        status,
      } = req.body;

      const data: UpdateCourseData = {
        title,
        description,
        coverImageUrl,
        durationHours,
        difficulty,
        categoryId,
        status,
      };

      const course = await courseService.updateCourse(
        req.params.id,
        data,
        req.user!.userId,
        req.user!.role
      );
      res.json(course);
    } catch (error) {
      sendError(res, error);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      await courseService.deleteCourse(req.params.id, req.user!.userId, req.user!.role);
      res.json({ message: "Curso deletado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getStudents(req: Request, res: Response): Promise<void> {
    try {
      const enrollments = await courseService.getCourseStudents(
        req.params.id,
        req.user!.userId,
        req.user!.role
      );
      res.json(enrollments);
    } catch (error) {
      sendError(res, error);
    }
  }
}


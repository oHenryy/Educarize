import { Request, Response } from "express";
import { NoteService } from "../services/noteService";
import { sendError } from "../utils/httpError";

const noteService = new NoteService();

export class NoteController {
  async createNote(req: Request, res: Response): Promise<void> {
    try {
      const { lessonId, content } = req.body;

      if (!lessonId || !content) {
        res.status(400).json({ error: "ID da aula e conteúdo são obrigatórios" });
        return;
      }

      const note = await noteService.createNote(req.user!, lessonId, content);
      res.status(201).json(note);
    } catch (error: any) {
      sendError(res, error, 400);
    }
  }

  async updateNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ error: "Conteúdo é obrigatório" });
        return;
      }

      const note = await noteService.updateNote(id, userId, content);
      res.json(note);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteNote(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await noteService.deleteNote(id, userId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getLessonNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { lessonId } = req.params;

      const notes = await noteService.getLessonNotes(userId, lessonId);
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getMyNotes(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const search = req.query.search as string | undefined;

      const notes = await noteService.getMyNotes(userId, search);
      res.json(notes);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}


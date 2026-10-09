import { Request, Response } from "express";
import { MessageService } from "../services/messageService";
import { sendError } from "../utils/httpError";

const messageService = new MessageService();

export class MessageController {
  async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { receiverId, content } = req.body;
      if (!receiverId || !content) {
        res.status(400).json({ error: "receiverId e content são obrigatórios" });
        return;
      }

      const message = await messageService.sendMessage(
        req.user!.userId,
        receiverId,
        content
      );
      res.status(201).json(message);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getConversation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await messageService.getConversation(
        req.user!.userId,
        userId,
        page,
        limit
      );
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await messageService.getConversations(req.user!.userId);
      res.json(conversations);
    } catch (error) {
      sendError(res, error);
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const message = await messageService.markAsRead(
        req.params.id,
        req.user!.userId
      );
      res.json(message);
    } catch (error) {
      sendError(res, error);
    }
  }

  async markConversationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      await messageService.markConversationAsRead(req.user!.userId, userId);
      res.json({ message: "Conversa marcada como lida" });
    } catch (error) {
      sendError(res, error);
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await messageService.getUnreadCount(req.user!.userId);
      res.json({ count });
    } catch (error) {
      sendError(res, error);
    }
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      await messageService.deleteMessage(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (error) {
      sendError(res, error);
    }
  }
}


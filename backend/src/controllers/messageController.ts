import { Request, Response } from "express";
import { MessageService } from "../services/messageService";

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
    } catch (error: any) {
      if (error.message === "Usuário destinatário não encontrado") {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao enviar mensagem" });
      }
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
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar conversa" });
    }
  }

  async getConversations(req: Request, res: Response): Promise<void> {
    try {
      const conversations = await messageService.getConversations(req.user!.userId);
      res.json(conversations);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar conversas" });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const message = await messageService.markAsRead(
        req.params.id,
        req.user!.userId
      );
      res.json(message);
    } catch (error: any) {
      if (error.message === "Mensagem não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao marcar como lida" });
      }
    }
  }

  async markConversationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      await messageService.markConversationAsRead(req.user!.userId, userId);
      res.json({ message: "Conversa marcada como lida" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao marcar conversa como lida" });
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const count = await messageService.getUnreadCount(req.user!.userId);
      res.json({ count });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar contador" });
    }
  }

  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      await messageService.deleteMessage(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (error: any) {
      if (error.message === "Mensagem não encontrada") {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes("permissão")) {
        res.status(403).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message || "Erro ao deletar mensagem" });
      }
    }
  }
}


import { Request, Response } from "express";
import { NotificationService } from "../services/notificationService";
import { sendError } from "../utils/httpError";

const notificationService = new NotificationService();

export class NotificationController {
  async getMyNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      const result = await notificationService.getMyNotifications(userId, page, limit);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      res.json(await notificationService.getEmailPreferences(req.user!.userId));
    } catch (error) {
      sendError(res, error);
    }
  }

  async updateEmailPreferences(req: Request, res: Response): Promise<void> {
    try {
      res.json(await notificationService.updateEmailPreferences(req.user!.userId, req.body.email));
    } catch (error) {
      sendError(res, error);
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);
      res.json(notification);
    } catch (error) {
      sendError(res, error);
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const result = await notificationService.markAllAsRead(userId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  }

  async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await notificationService.deleteNotification(id, userId);
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ unreadCount: count });
    } catch (error) {
      sendError(res, error);
    }
  }
}


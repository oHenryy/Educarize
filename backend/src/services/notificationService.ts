import type { NotificationType } from "@prisma/client";
import { prisma } from "../config/database";
import { emitToUser } from "../socket/realtime";
import { HttpError } from "../utils/httpError";

export class NotificationService {
  async createNotification(userId: string, title: string, message: string, type: NotificationType = "INFO") {

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    // Entrega imediata para quem estiver conectado (o frontend não precisa mais consultar periodicamente).
    emitToUser(userId, "notification", notification);

    return notification;
  }

  async getMyNotifications(userId: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new HttpError(404, "Notificação não encontrada");
    }

    if (notification.userId !== userId) {
      throw new HttpError(403, "Sem permissão para acessar esta notificação");
    }

    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { message: "Todas as notificações foram marcadas como lidas" };
  }

  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new HttpError(404, "Notificação não encontrada");
    }

    if (notification.userId !== userId) {
      throw new HttpError(403, "Sem permissão para deletar esta notificação");
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return { message: "Notificação deletada com sucesso" };
  }

  async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }
}


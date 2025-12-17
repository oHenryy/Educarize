import { prisma } from "../config/database";

export class NotificationService {
  async createNotification(userId: string, title: string, message: string, type: string = "INFO") {
    const validTypes = ["INFO", "SUCCESS", "WARNING", "ERROR"];
    if (!validTypes.includes(type)) {
      type = "INFO";
    }

    return await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });
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
      throw new Error("Notificação não encontrada");
    }

    if (notification.userId !== userId) {
      throw new Error("Sem permissão para acessar esta notificação");
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
      throw new Error("Notificação não encontrada");
    }

    if (notification.userId !== userId) {
      throw new Error("Sem permissão para deletar esta notificação");
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


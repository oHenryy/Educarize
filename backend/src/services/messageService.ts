import { prisma } from "../config/database";
import { NotificationService } from "./notificationService";

export class MessageService {
  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new Error("Você não pode enviar mensagem para si mesmo");
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new Error("Usuário destinatário não encontrado");
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const notificationService = new NotificationService();
    await notificationService
      .createNotification(
        receiverId,
        "Nova mensagem",
        `${message.sender.name} enviou uma mensagem para você.`,
        "INFO"
      )
      .catch((err) => console.error("Erro ao criar notificação:", err));

    return message;
  }

  async getConversation(userId1: string, userId2: string, page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    });

    const total = await prisma.message.count({
      where: {
        OR: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 },
        ],
      },
    });

    await prisma.message.updateMany({
      where: {
        receiverId: userId1,
        senderId: userId2,
        read: false,
      },
      data: { read: true },
    });

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConversations(userId: string) {
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const conversationMap = new Map<string, any>();

    messages.forEach((message) => {
      const otherUserId =
        message.senderId === userId ? message.receiverId : message.senderId;
      const otherUser =
        message.senderId === userId ? message.receiver : message.sender;

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          userId: otherUserId,
          user: otherUser,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      const conversation = conversationMap.get(otherUserId);
      if (
        !message.read &&
        message.receiverId === userId &&
        message.senderId === otherUserId
      ) {
        conversation.unreadCount++;
      }
    });

    return Array.from(conversationMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime()
    );
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Mensagem não encontrada");
    }

    if (message.receiverId !== userId) {
      throw new Error("Você não tem permissão para marcar esta mensagem como lida");
    }

    return await prisma.message.update({
      where: { id: messageId },
      data: { read: true },
    });
  }

  async markConversationAsRead(userId: string, otherUserId: string) {
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
      },
      data: { read: true },
    });
  }

  async getUnreadCount(userId: string) {
    return await prisma.message.count({
      where: {
        receiverId: userId,
        read: false,
      },
    });
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error("Mensagem não encontrada");
    }

    if (message.senderId !== userId) {
      throw new Error("Você só pode deletar suas próprias mensagens");
    }

    await prisma.message.delete({
      where: { id: messageId },
    });
  }
}


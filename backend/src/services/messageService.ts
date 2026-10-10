import { prisma } from "../config/database";
import { emitToUser } from "../socket/realtime";
import { NotificationService } from "./notificationService";
import { HttpError } from "../utils/httpError";

export class MessageService {
  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new HttpError(400, "Você não pode enviar mensagem para si mesmo");
    }

    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    });

    if (!receiver) {
      throw new HttpError(404, "Usuário destinatário não encontrado");
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

    // Entrega em tempo real ao destinatário, venha a mensagem pela API REST ou pelo socket.
    emitToUser(receiverId, "new_message", message);

    const notificationService = new NotificationService();
    await notificationService
      .createNotification(
        receiverId,
        "Nova mensagem",
        `${message.sender.name} enviou uma mensagem para você.`,
        "INFO",
        "MESSAGE"
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
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    });
    // Busca as mais recentes primeiro e devolve em ordem cronológica para exibição.
    messages.reverse();

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

  /**
   * Lista as conversas do usuário com a última mensagem e o número de não lidas.
   * Usa agregações no banco em vez de carregar todo o histórico de mensagens.
   */
  async getConversations(userId: string) {
    const userSelect = { select: { id: true, name: true, avatarUrl: true } } as const;

    // Data da última mensagem por par (remetente, destinatário) envolvendo o usuário.
    const pairs = await prisma.message.groupBy({
      by: ["senderId", "receiverId"],
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      _max: { createdAt: true },
    });

    // Junta as duas direções de cada conversa e fica com a mais recente.
    const lastByPartner = new Map<string, { senderId: string; receiverId: string; createdAt: Date }>();
    for (const pair of pairs) {
      const partnerId = pair.senderId === userId ? pair.receiverId : pair.senderId;
      const createdAt = pair._max.createdAt!;
      const current = lastByPartner.get(partnerId);
      if (!current || createdAt > current.createdAt) {
        lastByPartner.set(partnerId, { senderId: pair.senderId, receiverId: pair.receiverId, createdAt });
      }
    }

    if (lastByPartner.size === 0) return [];

    const [lastMessages, unread] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [...lastByPartner.values()].map((m) => ({
            senderId: m.senderId,
            receiverId: m.receiverId,
            createdAt: m.createdAt,
          })),
        },
        include: { sender: userSelect, receiver: userSelect },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
      prisma.message.groupBy({
        by: ["senderId"],
        where: { receiverId: userId, read: false },
        _count: { _all: true },
      }),
    ]);

    const unreadBySender = new Map(unread.map((u) => [u.senderId, u._count._all]));
    const conversations = new Map<string, {
      userId: string;
      user: { id: string; name: string; avatarUrl: string | null };
      lastMessage: (typeof lastMessages)[number];
      unreadCount: number;
    }>();

    // Já ordenado da mais recente para a mais antiga: a primeira de cada parceiro é a última mensagem.
    for (const message of lastMessages) {
      const partnerId = message.senderId === userId ? message.receiverId : message.senderId;
      if (conversations.has(partnerId)) continue;
      conversations.set(partnerId, {
        userId: partnerId,
        user: message.senderId === userId ? message.receiver : message.sender,
        lastMessage: message,
        unreadCount: unreadBySender.get(partnerId) ?? 0,
      });
    }

    return [...conversations.values()];
  }

  async markAsRead(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new HttpError(404, "Mensagem não encontrada");
    }

    if (message.receiverId !== userId) {
      throw new HttpError(403, "Você não tem permissão para marcar esta mensagem como lida");
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
      throw new HttpError(404, "Mensagem não encontrada");
    }

    if (message.senderId !== userId) {
      throw new HttpError(403, "Você só pode deletar suas próprias mensagens");
    }

    await prisma.message.delete({
      where: { id: messageId },
    });
  }
}


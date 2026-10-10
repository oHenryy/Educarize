import type { NotificationCategory, NotificationType } from "@prisma/client";
import { prisma } from "../config/database";
import { config } from "../config/env";
import { emitToUser, isUserOnline } from "../socket/realtime";
import { HttpError } from "../utils/httpError";
import { sendMail } from "../utils/mailer";

export type PreferenceCategory = Exclude<NotificationCategory, "GENERAL">;

/**
 * Categorias que o usuário pode configurar e se recebem e-mail por padrão. Avisos frequentes
 * e que são consequência da própria ação do usuário (aula concluída, matrícula) começam desligados.
 */
export const EMAIL_DEFAULTS: Record<PreferenceCategory, boolean> = {
  MESSAGE: true,
  COMMENT: true,
  CERTIFICATE: true,
  REVIEW: true,
  QUIZ: false,
  ENROLLMENT: false,
  PROGRESS: false,
};

export const PREFERENCE_CATEGORIES = Object.keys(EMAIL_DEFAULTS) as PreferenceCategory[];

const CATEGORY_LABELS: Record<PreferenceCategory, string> = {
  MESSAGE: "mensagens diretas",
  COMMENT: "comentários e respostas",
  CERTIFICATE: "certificados",
  REVIEW: "avaliações dos seus cursos",
  QUIZ: "resultados de quizzes",
  ENROLLMENT: "matrículas",
  PROGRESS: "progresso nas aulas e trilhas",
};

export class NotificationService {
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = "INFO",
    category: NotificationCategory = "GENERAL"
  ) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        category,
      },
    });

    // Entrega imediata para quem estiver conectado (o frontend não precisa mais consultar periodicamente).
    emitToUser(userId, "notification", notification);

    // O e-mail sai em segundo plano: uma falha de SMTP não afeta a ação que gerou a notificação.
    if (category !== "GENERAL") {
      this.sendEmail(userId, title, message, category).catch((err) =>
        console.error("Erro ao enviar notificação por e-mail:", err)
      );
    }

    return notification;
  }

  private async sendEmail(userId: string, title: string, message: string, category: PreferenceCategory) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, emailVerifiedAt: true, notificationPreferences: { where: { category } } },
    });

    // Só envia para endereços confirmados e quando a preferência (ou o padrão) permite.
    if (!user?.emailVerifiedAt) return;
    if (!(user.notificationPreferences[0]?.email ?? EMAIL_DEFAULTS[category])) return;
    // Mensagens já aparecem em tempo real para quem está com o Educarize aberto.
    if (category === "MESSAGE" && (await isUserOnline(userId))) return;

    await sendMail({
      to: user.email,
      subject: `${title} — Educarize`,
      text:
        `Olá, ${user.name}!\n\n${message}\n\n` +
        `Veja no Educarize: ${config.frontendUrl}/notifications\n\n` +
        `Você recebe este e-mail porque os avisos de ${CATEGORY_LABELS[category]} estão ativados. ` +
        `Para mudar, acesse ${config.frontendUrl}/profile.`,
    });
  }

  async getEmailPreferences(userId: string) {
    const saved = await prisma.notificationPreference.findMany({ where: { userId } });
    return PREFERENCE_CATEGORIES.map((category) => ({
      category,
      email: saved.find((pref) => pref.category === category)?.email ?? EMAIL_DEFAULTS[category],
    }));
  }

  async updateEmailPreferences(userId: string, preferences: Partial<Record<PreferenceCategory, boolean>>) {
    const entries = Object.entries(preferences) as [PreferenceCategory, boolean][];
    await prisma.$transaction(
      entries.map(([category, email]) =>
        prisma.notificationPreference.upsert({
          where: { userId_category: { userId, category } },
          create: { userId, category, email },
          update: { email },
        })
      )
    );
    return this.getEmailPreferences(userId);
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


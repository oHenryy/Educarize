import { prisma } from "../config/database";
import { NotificationService } from "./notificationService";

export class ReviewService {
  async createReview(userId: string, courseId: string, rating: number, comment?: string) {
    if (rating < 1 || rating > 5) {
      throw new Error("Avaliação deve ser entre 1 e 5 estrelas");
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    const existing = await prisma.courseReview.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existing) {
      throw new Error("Você já avaliou este curso");
    }

    const review = await prisma.courseReview.create({
      data: {
        userId,
        courseId,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        course: {
          select: {
            title: true,
            instructorId: true,
          },
        },
      },
    });

    const notificationService = new NotificationService();
    if (review.course.instructorId) {
      await notificationService.createNotification(
        review.course.instructorId,
        "Nova avaliação no seu curso",
        `Seu curso "${review.course.title}" recebeu uma nova avaliação de ${rating} estrelas${comment ? " com comentário" : ""}.`,
        "INFO"
      ).catch(err => console.error("Erro ao criar notificação para instrutor:", err));
    }

    return review;
  }

  async updateReview(reviewId: string, userId: string, rating?: number, comment?: string) {
    const review = await prisma.courseReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Avaliação não encontrada");
    }

    if (review.userId !== userId) {
      throw new Error("Sem permissão para editar esta avaliação");
    }

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new Error("Avaliação deve ser entre 1 e 5 estrelas");
    }

    return await prisma.courseReview.update({
      where: { id: reviewId },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.courseReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error("Avaliação não encontrada");
    }

    if (review.userId !== userId) {
      throw new Error("Sem permissão para deletar esta avaliação");
    }

    await prisma.courseReview.delete({
      where: { id: reviewId },
    });

    return { message: "Avaliação deletada com sucesso" };
  }

  async getCourseReviews(courseId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.courseReview.findMany({
        where: { courseId },
        include: {
          user: {
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
      }),
      prisma.courseReview.count({
        where: { courseId },
      }),
    ]);

    const averageRating = await prisma.courseReview.aggregate({
      where: { courseId },
      _avg: {
        rating: true,
      },
    });

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      averageRating: averageRating._avg.rating || 0,
    };
  }

  async getMyReviews(userId: string) {
    return await prisma.courseReview.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}


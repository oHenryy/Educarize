import { prisma } from "../config/database";

export class FavoriteService {
  async addFavorite(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existing) {
      throw new Error("Curso já está nos favoritos");
    }

    return await prisma.favorite.create({
      data: { userId, courseId },
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, name: true, avatarUrl: true },
            },
            category: true,
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
    });
  }

  async removeFavorite(userId: string, courseId: string) {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!favorite) {
      throw new Error("Favorito não encontrado");
    }

    await prisma.favorite.delete({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    return { message: "Favorito removido com sucesso" };
  }

  async getMyFavorites(userId: string) {
    return await prisma.favorite.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            instructor: {
              select: { id: true, name: true, avatarUrl: true },
            },
            category: true,
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async isFavorite(userId: string, courseId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    return !!favorite;
  }
}


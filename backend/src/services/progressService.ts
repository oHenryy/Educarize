import { prisma } from "../config/database";

export class ProgressService {
  async markLessonCompleted(userId: string, lessonId: string) {
    // Verificar se já existe progresso
    const existing = await prisma.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (existing) {
      // Atualizar para concluído se ainda não estiver
      if (!existing.completed) {
        return await prisma.userProgress.update({
          where: {
            userId_lessonId: {
              userId,
              lessonId,
            },
          },
          data: {
            completed: true,
            completedAt: new Date(),
          },
        });
      }
      return existing;
    }

    // Criar novo progresso
    return await prisma.userProgress.create({
      data: {
        userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
      },
    });
  }

  async markLessonIncomplete(userId: string, lessonId: string) {
    const existing = await prisma.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (existing) {
      return await prisma.userProgress.update({
        where: {
          userId_lessonId: {
            userId,
            lessonId,
          },
        },
        data: {
          completed: false,
          completedAt: null,
        },
      });
    }

    return null;
  }

  async getCourseProgress(userId: string, courseId: string) {
    // Buscar todas as aulas do curso
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          include: {
            lessons: true,
          },
        },
      },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    // Contar total de aulas
    const totalLessons = course.modules.reduce(
      (acc, mod) => acc + mod.lessons.length,
      0
    );

    if (totalLessons === 0) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        progressPercentage: 0,
        lessons: [],
      };
    }

    // Buscar progresso do usuário para todas as aulas
    const lessonIds = course.modules.flatMap((mod) =>
      mod.lessons.map((lesson) => lesson.id)
    );

    const progress = await prisma.userProgress.findMany({
      where: {
        userId,
        lessonId: {
          in: lessonIds,
        },
        completed: true,
      },
    });

    const completedLessons = progress.length;
    const progressPercentage = Math.round(
      (completedLessons / totalLessons) * 100
    );

    // Mapear progresso por aula
    const lessonsProgress = lessonIds.map((lessonId) => {
      const lessonProgress = progress.find((p) => p.lessonId === lessonId);
      return {
        lessonId,
        completed: !!lessonProgress,
        completedAt: lessonProgress?.completedAt || null,
      };
    });

    return {
      totalLessons,
      completedLessons,
      progressPercentage,
      lessons: lessonsProgress,
    };
  }

  async getLessonProgress(userId: string, lessonId: string) {
    const progress = await prisma.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    return progress || null;
  }
}


import { prisma } from "../config/database";
import { CertificateService } from "./certificateService";
import { NotificationService } from "./notificationService";

export class ProgressService {
  async markLessonCompleted(userId: string, lessonId: string) {
    const existing = await prisma.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    const certificateService = new CertificateService();
    let progress;

    if (existing) {
      if (!existing.completed) {
        progress = await prisma.userProgress.update({
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
      } else {
        progress = existing;
        return progress;
      }
    } else {
      progress = await prisma.userProgress.create({
        data: {
          userId,
          lessonId,
          completed: true,
          completedAt: new Date(),
        },
      });
    }

    try {
      const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          module: {
            select: {
              courseId: true,
              course: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      if (lesson) {
        const notificationService = new NotificationService();
        await notificationService.createNotification(
          userId,
          "Aula concluída!",
          `Você concluiu a aula "${lesson.title}" do curso "${lesson.module.course.title}". Continue assim!`,
          "SUCCESS"
        ).catch(err => console.error("Erro ao criar notificação:", err));

        const certificate = await certificateService.checkAndGenerateCertificate(userId, lesson.module.courseId);
        
        if (certificate) {
          await notificationService.createNotification(
            userId,
            "🎉 Parabéns! Certificado gerado!",
            `Você completou o curso "${lesson.module.course.title}" e seu certificado está disponível para download.`,
            "SUCCESS"
          ).catch(err => console.error("Erro ao criar notificação de certificado:", err));
        }
      }
    } catch (error) {
      console.error("Erro ao verificar certificado:", error);
    }

    return progress;
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


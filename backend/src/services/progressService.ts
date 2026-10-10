import { prisma } from "../config/database";
import { CertificateService, pendingQuizzesForCertificate } from "./certificateService";
import { NotificationService } from "./notificationService";
import { LearningPathService } from "./learningPathService";
import { HttpError } from "../utils/httpError";
import { getCourseIdByLesson, isEnrolled } from "../utils/courseAccess";

async function assertEnrolledInLessonCourse(userId: string, lessonId: string): Promise<void> {
  const courseId = await getCourseIdByLesson(lessonId);
  if (!(await isEnrolled(userId, courseId))) {
    throw new HttpError(403, "Você precisa estar matriculado no curso para registrar progresso");
  }
}

/** Fração do vídeo que precisa ser assistida para a aula ser concluída automaticamente. */
export const AUTO_COMPLETE_RATIO = 0.9;

export class ProgressService {
  /**
   * Registra o andamento do vídeo: soma o tempo efetivamente assistido (enviado como incremento pelo player),
   * guarda a posição para retomar e conclui a aula automaticamente ao atingir 90% da duração.
   */
  async recordVideoProgress(
    userId: string,
    lessonId: string,
    data: { positionSeconds: number; durationSeconds: number; watchedDeltaSeconds: number }
  ) {
    await assertEnrolledInLessonCourse(userId, lessonId);

    const existing = await prisma.userProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const duration = data.durationSeconds;
    const watchedSeconds = Math.min(duration, (existing?.watchedSeconds ?? 0) + data.watchedDeltaSeconds);
    const position = Math.min(data.positionSeconds, duration);

    const progress = await prisma.userProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        watchedSeconds,
        lastPositionSeconds: position,
        videoDurationSeconds: duration,
      },
      update: { watchedSeconds, lastPositionSeconds: position, videoDurationSeconds: duration },
    });

    const reachedThreshold = watchedSeconds >= Math.floor(duration * AUTO_COMPLETE_RATIO);
    if (!progress.completed && reachedThreshold) {
      await this.markLessonCompleted(userId, lessonId);
      return { ...progress, completed: true, autoCompleted: true };
    }

    return { ...progress, autoCompleted: false };
  }

  async markLessonCompleted(userId: string, lessonId: string) {
    await assertEnrolledInLessonCourse(userId, lessonId);

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
      progress = await prisma.userProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          completed: true,
          completedAt: new Date(),
        },
        update: {
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
          "SUCCESS",
          "PROGRESS"
        ).catch(err => console.error("Erro ao criar notificação:", err));

        const certificate = await certificateService.checkAndGenerateCertificate(userId, lesson.module.courseId);
        
        if (certificate) {
          await notificationService.createNotification(
            userId,
            "🎉 Parabéns! Certificado gerado!",
            `Você completou o curso "${lesson.module.course.title}" e seu certificado está disponível para download.`,
            "SUCCESS",
            "CERTIFICATE"
          ).catch(err => console.error("Erro ao criar notificação de certificado:", err));
        }

        await new LearningPathService().onCourseProgressChanged(userId, lesson.module.courseId);
      }
    } catch (error) {
      console.error("Erro ao verificar certificado:", error);
    }

    return progress;
  }

  async markLessonIncomplete(userId: string, lessonId: string) {
    await assertEnrolledInLessonCourse(userId, lessonId);

    const existing = await prisma.userProgress.findUnique({
      where: {
        userId_lessonId: {
          userId,
          lessonId,
        },
      },
    });

    if (existing) {
      const updated = await prisma.userProgress.update({
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

      await new LearningPathService()
        .onCourseProgressChanged(userId, await getCourseIdByLesson(lessonId))
        .catch((err) => console.error("Erro ao atualizar progresso das trilhas:", err));

      return updated;
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
      throw new HttpError(404, "Curso não encontrado");
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
        pendingQuizzes: [],
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
      // Quizzes que ainda faltam para o certificado (só em cursos que exigem aprovação).
      pendingQuizzes: await pendingQuizzesForCertificate(userId, courseId),
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


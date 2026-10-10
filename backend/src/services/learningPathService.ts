import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { NotificationService } from "./notificationService";
import { Difficulty, LearningPathStatus } from "@prisma/client";
import { HttpError } from "../utils/httpError";
import { isEnumValue } from "../utils/enums";
import { AuthUser } from "../utils/courseAccess";

export interface CreateLearningPathData {
  title: string;
  description?: string;
  coverImageUrl?: string;
  difficulty?: string;
  estimatedHours?: number;
  instructorId: string;
  status?: string;
}

export interface UpdateLearningPathData {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  difficulty?: string;
  estimatedHours?: number;
  status?: string;
}

export class LearningPathService {
  async listLearningPaths(
    filters: { status?: string; instructorId?: string; difficulty?: string },
    user?: AuthUser
  ) {
    const where: any = {};

    // Trilhas não publicadas só aparecem para administradores ou para o próprio instrutor.
    const canSeeUnpublished =
      user?.role === "ADMIN" || (!!user && !!filters.instructorId && filters.instructorId === user.userId);

    if (canSeeUnpublished) {
      if (filters.status) where.status = filters.status;
    } else {
      where.status = "PUBLISHED";
    }

    if (filters.instructorId) {
      where.instructorId = filters.instructorId;
    }

    if (filters.difficulty) {
      where.difficulty = filters.difficulty;
    }

    return await prisma.learningPath.findMany({
      where,
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                coverImageUrl: true,
                durationHours: true,
                difficulty: true,
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLearningPathById(id: string, user?: AuthUser) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        courses: {
          include: {
            course: {
              include: {
                instructor: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
                category: true,
                _count: {
                  select: {
                    enrollments: true,
                    modules: true,
                  },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.status !== "PUBLISHED") {
      const isOwnerOrAdmin =
        !!user && (user.role === "ADMIN" || user.userId === learningPath.instructorId);
      const isEnrolled =
        !!user &&
        !!(await prisma.learningPathEnrollment.findUnique({
          where: { userId_learningPathId: { userId: user.userId, learningPathId: id } },
          select: { id: true },
        }));
      if (!isOwnerOrAdmin && !isEnrolled) {
        throw new HttpError(404, "Trilha de aprendizado não encontrada");
      }
    }

    return learningPath;
  }

  async createLearningPath(data: CreateLearningPathData, userId: string, userRole: string) {
    if (data.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para criar trilha de aprendizado");
    }

    const finalDifficulty: Difficulty | null = isEnumValue(Difficulty, data.difficulty) ? data.difficulty : null;
    const finalStatus: LearningPathStatus = isEnumValue(LearningPathStatus, data.status) ? data.status : "DRAFT";

    const learningPath = await prisma.learningPath.create({
      data: {
        title: data.title,
        description: data.description,
        coverImageUrl: data.coverImageUrl,
        difficulty: finalDifficulty,
        estimatedHours: data.estimatedHours,
        instructorId: data.instructorId,
        status: finalStatus,
      },
      include: {
        instructor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    await logActivity({
      action: "LEARNING_PATH_CREATED",
      description: `Trilha "${learningPath.title}" criada`,
      resourceId: learningPath.id,
      resourceType: "LEARNING_PATH",
      userId,
    });

    return learningPath;
  }

  async updateLearningPath(
    id: string,
    data: UpdateLearningPathData,
    userId: string,
    userRole: string
  ) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar esta trilha");
    }

    const finalDifficulty: Difficulty | undefined = isEnumValue(Difficulty, data.difficulty) ? data.difficulty : undefined;
    const finalStatus: LearningPathStatus | undefined = isEnumValue(LearningPathStatus, data.status)
      ? data.status
      : undefined;

    const updated = await prisma.learningPath.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
        ...(finalDifficulty && { difficulty: finalDifficulty }),
        ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
        ...(finalStatus && { status: finalStatus }),
      },
    });

    await logActivity({
      action: "LEARNING_PATH_UPDATED",
      description: `Trilha "${updated.title}" atualizada`,
      resourceId: updated.id,
      resourceType: "LEARNING_PATH",
      userId,
    });

    return updated;
  }

  async deleteLearningPath(id: string, userId: string, userRole: string) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar esta trilha");
    }

    const title = learningPath.title;
    await prisma.learningPath.delete({ where: { id } });

    await logActivity({
      action: "LEARNING_PATH_DELETED",
      description: `Trilha "${title}" deletada`,
      resourceId: id,
      resourceType: "LEARNING_PATH",
      userId,
    });
  }

  async addCourseToPath(
    learningPathId: string,
    courseId: string,
    userId: string,
    userRole: string,
    order?: number,
    isRequired?: boolean
  ) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para adicionar curso nesta trilha");
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (course.status !== "PUBLISHED") {
      throw new HttpError(400, "Apenas cursos publicados podem ser adicionados à trilha");
    }

    const alreadyInPath = await prisma.learningPathCourse.findUnique({
      where: { learningPathId_courseId: { learningPathId, courseId } },
      select: { id: true },
    });
    if (alreadyInPath) {
      throw new HttpError(409, "Este curso já faz parte da trilha");
    }

    const maxOrder = await prisma.learningPathCourse.findFirst({
      where: { learningPathId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    return await prisma.learningPathCourse.create({
      data: {
        learningPathId,
        courseId,
        order: order ?? (maxOrder ? maxOrder.order + 1 : 0),
        isRequired: isRequired ?? true,
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            durationHours: true,
          },
        },
      },
    });
  }

  async removeCourseFromPath(
    learningPathId: string,
    courseId: string,
    userId: string,
    userRole: string
  ) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para remover curso desta trilha");
    }

    await prisma.learningPathCourse.deleteMany({
      where: {
        learningPathId,
        courseId,
      },
    });
  }

  async reorderCourses(learningPathId: string, courseIds: string[], userId: string, userRole: string) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: { courses: { select: { courseId: true } } },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para reordenar cursos desta trilha");
    }

    const current = new Set(learningPath.courses.map((c) => c.courseId));
    if (courseIds.length !== current.size || !courseIds.every((id) => current.has(id))) {
      throw new HttpError(400, "A lista deve conter exatamente os cursos atuais da trilha");
    }

    await prisma.$transaction(
      courseIds.map((courseId, index) =>
        prisma.learningPathCourse.update({
          where: { learningPathId_courseId: { learningPathId, courseId } },
          data: { order: index },
        })
      )
    );

    return this.getLearningPathById(learningPathId, { userId, role: userRole });
  }

  async enrollInPath(learningPathId: string, userId: string) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
      include: {
        courses: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!learningPath) {
      throw new HttpError(404, "Trilha de aprendizado não encontrada");
    }

    if (learningPath.status !== "PUBLISHED") {
      throw new HttpError(400, "Trilha não está publicada");
    }

    const existing = await prisma.learningPathEnrollment.findUnique({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId,
        },
      },
    });

    if (existing) {
      throw new HttpError(409, "Você já está matriculado nesta trilha");
    }

    const enrollment = await prisma.learningPathEnrollment.create({
      data: {
        userId,
        learningPathId,
      },
      include: {
        learningPath: {
          select: {
            title: true,
            instructorId: true,
          },
        },
      },
    });

    const notificationService = new NotificationService();
    await notificationService
      .createNotification(
        userId,
        "Matrícula na trilha realizada!",
        `Você foi matriculado na trilha "${enrollment.learningPath.title}". Comece a estudar agora!`,
        "SUCCESS"
      )
      .catch((err) => console.error("Erro ao criar notificação:", err));

    if (enrollment.learningPath.instructorId) {
      await notificationService
        .createNotification(
          enrollment.learningPath.instructorId,
          "Novo aluno na sua trilha",
          `Um novo aluno se matriculou na sua trilha "${enrollment.learningPath.title}".`,
          "INFO"
        )
        .catch((err) => console.error("Erro ao criar notificação para instrutor:", err));
    }

    for (const pathCourse of learningPath.courses) {
      // Só matricula automaticamente em cursos obrigatórios e publicados.
      if (pathCourse.isRequired && pathCourse.course.status === "PUBLISHED") {
        try {
          await prisma.enrollment.upsert({
            where: {
              userId_courseId: {
                userId,
                courseId: pathCourse.courseId,
              },
            },
            create: {
              userId,
              courseId: pathCourse.courseId,
            },
            update: {},
          });
        } catch (err) {
          console.error("Erro ao matricular em curso:", err);
        }
      }
    }

    await logActivity({
      action: "LEARNING_PATH_ENROLLMENT_CREATED",
      description: `Matrícula na trilha "${enrollment.learningPath.title}"`,
      resourceId: enrollment.id,
      resourceType: "LEARNING_PATH_ENROLLMENT",
      userId,
    });

    return enrollment;
  }

  /**
   * Calcula o progresso do usuário na trilha (somente leitura).
   * Considera os cursos obrigatórios (ou todos, se nenhum for obrigatório) e usa contagens no banco.
   */
  private async computeProgress(learningPathId: string, userId: string) {
    const pathCourses = await prisma.learningPathCourse.findMany({
      where: { learningPathId },
      select: { courseId: true, isRequired: true },
    });
    const counted = pathCourses.some((c) => c.isRequired) ? pathCourses.filter((c) => c.isRequired) : pathCourses;

    const perCourse = await Promise.all(
      counted.map(async ({ courseId }) => {
        const [lessons, completed] = await Promise.all([
          prisma.lesson.count({ where: { module: { courseId } } }),
          prisma.userProgress.count({ where: { userId, completed: true, lesson: { module: { courseId } } } }),
        ]);
        return { lessons, completed };
      })
    );

    const totalLessons = perCourse.reduce((sum, c) => sum + c.lessons, 0);
    const completedLessons = perCourse.reduce((sum, c) => sum + c.completed, 0);

    return {
      progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
      totalCourses: counted.length,
      completedCourses: perCourse.filter((c) => c.lessons > 0 && c.completed >= c.lessons).length,
      totalLessons,
      completedLessons,
    };
  }

  async getUserProgress(learningPathId: string, userId: string) {
    const enrollment = await prisma.learningPathEnrollment.findUnique({
      where: { userId_learningPathId: { userId, learningPathId } },
      include: { learningPath: { select: { id: true, title: true } } },
    });

    if (!enrollment) {
      throw new HttpError(404, "Você não está matriculado nesta trilha");
    }

    const stats = await this.computeProgress(learningPathId, userId);
    return { enrollment: { ...enrollment, progress: stats.progress }, ...stats };
  }

  /**
   * Chamado quando o progresso do usuário em um curso muda: atualiza as trilhas que contêm o curso
   * e registra (com notificação) as que acabaram de ser concluídas.
   */
  async onCourseProgressChanged(userId: string, courseId: string): Promise<void> {
    const enrollments = await prisma.learningPathEnrollment.findMany({
      where: { userId, learningPath: { courses: { some: { courseId } } } },
      include: { learningPath: { select: { title: true } } },
    });

    for (const enrollment of enrollments) {
      const { progress } = await this.computeProgress(enrollment.learningPathId, userId);
      const justCompleted = progress === 100 && !enrollment.completedAt;

      await prisma.learningPathEnrollment.update({
        where: { id: enrollment.id },
        data: { progress, ...(justCompleted && { completedAt: new Date() }) },
      });

      if (justCompleted) {
        await new NotificationService()
          .createNotification(
            userId,
            "Parabéns! Trilha concluída!",
            `Você completou 100% da trilha "${enrollment.learningPath.title}".`,
            "SUCCESS"
          )
          .catch((err) => console.error("Erro ao criar notificação:", err));
      }
    }
  }

  async getUserLearningPaths(userId: string) {
    const enrollments = await prisma.learningPathEnrollment.findMany({
      where: { userId },
      include: {
        learningPath: {
          include: {
            instructor: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            courses: {
              include: {
                course: {
                  select: {
                    id: true,
                    title: true,
                    coverImageUrl: true,
                  },
                },
              },
              orderBy: { order: "asc" },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    return Promise.all(
      enrollments.map(async (enrollment) => ({
        ...enrollment,
        progress: (await this.computeProgress(enrollment.learningPathId, userId)).progress,
      }))
    );
  }
}


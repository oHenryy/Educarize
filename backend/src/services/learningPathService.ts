import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { NotificationService } from "./notificationService";
import { HttpError } from "../utils/httpError";
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

    const validDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
    const finalDifficulty =
      data.difficulty && validDifficulties.includes(data.difficulty) ? data.difficulty : null;

    const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
    const finalStatus =
      data.status && validStatuses.includes(data.status) ? data.status : "DRAFT";

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

    let finalDifficulty: string | undefined = undefined;
    if (data.difficulty) {
      const validDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
      if (validDifficulties.includes(data.difficulty)) {
        finalDifficulty = data.difficulty;
      }
    }

    let finalStatus: string | undefined = undefined;
    if (data.status) {
      const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED"];
      if (validStatuses.includes(data.status)) {
        finalStatus = data.status;
      }
    }

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

  async getUserProgress(learningPathId: string, userId: string) {
    const enrollment = await prisma.learningPathEnrollment.findUnique({
      where: {
        userId_learningPathId: {
          userId,
          learningPathId,
        },
      },
      include: {
        learningPath: {
          include: {
            courses: {
              include: {
                course: {
                  include: {
                    modules: {
                      include: {
                        lessons: true,
                      },
                    },
                  },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new HttpError(404, "Você não está matriculado nesta trilha");
    }

    // O progresso considera apenas cursos obrigatórios (ou todos, se nenhum for marcado como obrigatório).
    const allCourses = enrollment.learningPath.courses;
    const requiredCourses = allCourses.some((c) => c.isRequired)
      ? allCourses.filter((c) => c.isRequired)
      : allCourses;

    const totalCourses = requiredCourses.length;
    let completedCourses = 0;
    let totalLessons = 0;
    let completedLessons = 0;

    for (const pathCourse of requiredCourses) {
      const courseLessons = pathCourse.course.modules.reduce(
        (sum, mod) => sum + mod.lessons.length,
        0
      );
      totalLessons += courseLessons;

      const courseCompleted = await prisma.userProgress.count({
        where: {
          userId,
          lesson: {
            module: {
              courseId: pathCourse.courseId,
            },
          },
          completed: true,
        },
      });

      completedLessons += courseCompleted;

      if (courseLessons > 0 && courseCompleted >= courseLessons) {
        completedCourses++;
      }
    }

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    const justCompleted = progress === 100 && !enrollment.completedAt;

    if (progress !== enrollment.progress || justCompleted) {
      await prisma.learningPathEnrollment.update({
        where: { id: enrollment.id },
        data: {
          progress,
          ...(justCompleted && { completedAt: new Date() }),
        },
      });
    }

    if (justCompleted) {
      const notificationService = new NotificationService();
      await notificationService
        .createNotification(
          userId,
          "Parabéns! Trilha concluída!",
          `Você completou 100% da trilha "${enrollment.learningPath.title}".`,
          "SUCCESS"
        )
        .catch((err) => console.error("Erro ao criar notificação:", err));
    }

    return {
      enrollment,
      progress,
      totalCourses,
      completedCourses,
      totalLessons,
      completedLessons,
    };
  }

  async getUserLearningPaths(userId: string) {
    return await prisma.learningPathEnrollment.findMany({
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
  }
}


import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { NotificationService } from "./notificationService";

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
  async listLearningPaths(filters: { status?: string; instructorId?: string; difficulty?: string }) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
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

  async getLearningPathById(id: string) {
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
      throw new Error("Trilha de aprendizado não encontrada");
    }

    return learningPath;
  }

  async createLearningPath(data: CreateLearningPathData, userId: string, userRole: string) {
    if (data.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para criar trilha de aprendizado");
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
      throw new Error("Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para editar esta trilha");
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
      throw new Error("Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar esta trilha");
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
    order?: number,
    isRequired?: boolean,
    userId: string,
    userRole: string
  ) {
    const learningPath = await prisma.learningPath.findUnique({
      where: { id: learningPathId },
    });

    if (!learningPath) {
      throw new Error("Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para adicionar curso nesta trilha");
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
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
      throw new Error("Trilha de aprendizado não encontrada");
    }

    if (learningPath.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para remover curso desta trilha");
    }

    await prisma.learningPathCourse.deleteMany({
      where: {
        learningPathId,
        courseId,
      },
    });
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
      throw new Error("Trilha de aprendizado não encontrada");
    }

    if (learningPath.status !== "PUBLISHED") {
      throw new Error("Trilha não está publicada");
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
      throw new Error("Você já está matriculado nesta trilha");
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
      if (pathCourse.isRequired) {
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
      throw new Error("Você não está matriculado nesta trilha");
    }

    const totalCourses = enrollment.learningPath.courses.length;
    let completedCourses = 0;
    let totalLessons = 0;
    let completedLessons = 0;

    for (const pathCourse of enrollment.learningPath.courses) {
      const courseLessons = pathCourse.course.modules.reduce(
        (sum, mod) => sum + mod.lessons.length,
        0
      );
      totalLessons += courseLessons;

      const courseProgress = await prisma.userProgress.findMany({
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

      completedLessons += courseProgress.length;

      if (courseLessons > 0 && courseProgress.length === courseLessons) {
        completedCourses++;
      }
    }

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    await prisma.learningPathEnrollment.update({
      where: { id: enrollment.id },
      data: { progress },
    });

    if (progress === 100 && !enrollment.completedAt) {
      await prisma.learningPathEnrollment.update({
        where: { id: enrollment.id },
        data: { completedAt: new Date() },
      });

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


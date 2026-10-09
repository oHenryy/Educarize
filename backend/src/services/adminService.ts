import bcrypt from "bcryptjs";
import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { SessionService } from "./sessionService";
import { HttpError } from "../utils/httpError";

export class AdminService {
  async getDashboardStats() {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalLessons,
      totalQuizzes,
      totalComments,
      totalCertificates,
      totalModules,
      totalQuizAttempts,
      recentUsers,
      recentCourses,
      coursesByStatus,
      usersByRole,
      coursesByCategory,
      coursesByDifficulty,
      topCourses,
      recentEnrollments,
      recentComments,
      quizStats,
      progressStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.enrollment.count(),
      prisma.lesson.count(),
      prisma.quiz.count(),
      prisma.lessonComment.count(),
      prisma.certificate.count(),
      prisma.module.count(),
      prisma.quizAttempt.count(),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.course.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              modules: true,
            },
          },
        },
      }),
      prisma.course.groupBy({
        by: ["status"],
        _count: {
          status: true,
        },
      }),
      prisma.user.groupBy({
        by: ["role"],
        _count: {
          role: true,
        },
      }),
      prisma.course.groupBy({
        by: ["categoryId"],
        _count: {
          categoryId: true,
        },
      }),
      prisma.course.groupBy({
        by: ["difficulty"],
        _count: {
          difficulty: true,
        },
      }),
      prisma.course.findMany({
        take: 20,
        orderBy: { enrollments: { _count: "desc" } },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      }),
      prisma.enrollment.findMany({
        take: 10,
        orderBy: { enrolledAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.lessonComment.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          lesson: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  course: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      Promise.all([
        prisma.quizAttempt.count({ where: { passed: true } }),
        prisma.quizAttempt.count({ where: { passed: false } }),
        prisma.quizAttempt.aggregate({
          _avg: { score: true },
        }),
      ]),
      Promise.all([
        prisma.userProgress.count({ where: { completed: true } }),
        prisma.userProgress.count(),
      ]),
    ]);

    const categoryIds = coursesByCategory
      .map((c) => c.categoryId)
      .filter((id): id is string => id !== null);
    const categories = await prisma.courseCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return {
      totals: {
        users: totalUsers,
        courses: totalCourses,
        enrollments: totalEnrollments,
        lessons: totalLessons,
        quizzes: totalQuizzes,
        comments: totalComments,
        certificates: totalCertificates,
        modules: totalModules,
        quizAttempts: totalQuizAttempts,
      },
      recentUsers,
      recentCourses,
      coursesByStatus: coursesByStatus.map((item) => ({
        status: item.status,
        count: item._count.status,
      })),
      usersByRole: usersByRole.map((item) => ({
        role: item.role,
        count: item._count.role,
      })),
      coursesByCategory: coursesByCategory
        .map((item) => ({
          categoryId: item.categoryId,
          categoryName: item.categoryId ? categoryMap.get(item.categoryId) || "Sem categoria" : "Sem categoria",
          count: item._count.categoryId,
        }))
        .sort((a, b) => b.count - a.count),
      coursesByDifficulty: coursesByDifficulty.map((item) => ({
        difficulty: item.difficulty,
        count: item._count.difficulty,
      })),
      topCourses: topCourses.map((course) => ({
        id: course.id,
        title: course.title,
        instructor: course.instructor.name,
        category: course.category?.name || "Sem categoria",
        enrollments: course._count.enrollments,
      })),
      recentEnrollments: recentEnrollments.map((enrollment) => ({
        id: enrollment.id,
        userName: enrollment.user.name,
        userEmail: enrollment.user.email,
        courseTitle: enrollment.course.title,
        enrolledAt: enrollment.enrolledAt,
      })),
      recentComments: recentComments.map((comment) => ({
        id: comment.id,
        userName: comment.user.name,
        courseTitle: comment.lesson.module.course.title,
        lessonTitle: comment.lesson.title,
        content: comment.content.substring(0, 100) + (comment.content.length > 100 ? "..." : ""),
        createdAt: comment.createdAt,
      })),
      quizStats: {
        passed: quizStats[0],
        failed: quizStats[1],
        averageScore: quizStats[2]._avg.score || 0,
      },
      progressStats: {
        completedLessons: progressStats[0],
        totalProgress: progressStats[1],
        completionRate: progressStats[1] > 0 ? Math.round((progressStats[0] / progressStats[1]) * 100) : 0,
      },
    };
  }

  async getAllUsers(page: number = 1, limit: number = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: {
              coursesCreated: true,
              learningPathsCreated: true,
              enrollments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            coursesCreated: true,
            enrollments: true,
            progress: true,
            comments: true,
            certificates: true,
            quizAttempts: true,
          },
        },
        coursesCreated: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
        },
        enrollments: {
          take: 5,
          orderBy: { enrolledAt: "desc" },
          include: {
            course: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    return user;
  }

  async updateUserRole(userId: string, newRole: string, requesterId: string) {
    if (userId === requesterId) {
      throw new HttpError(400, "Você não pode alterar o seu próprio papel");
    }

    const validRoles = ["ADMIN", "INSTRUCTOR", "STUDENT"];
    if (!validRoles.includes(newRole)) {
      throw new HttpError(400, "Papel inválido");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    if (user.role !== "STUDENT" && newRole === "STUDENT") {
      const owned = await this.countOwnedContent(userId);
      if (owned.courses + owned.learningPaths > 0) {
        throw new HttpError(400, 
          `Este usuário é autor de ${owned.courses} curso(s) e ${owned.learningPaths} trilha(s). ` +
            "Transfira o conteúdo para outro instrutor antes de alterar o papel para STUDENT."
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    await logActivity({
      action: "USER_UPDATED",
      description: `Papel do usuário "${updated.name}" alterado para ${newRole}`,
      resourceId: updated.id,
      resourceType: "USER",
      userId: requesterId,
    });

    return updated;
  }

  async resetUserPassword(userId: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    if (user.role === "ADMIN") {
      throw new HttpError(403, "Não é possível resetar senha de um usuário ADMIN");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Senha redefinida pelo admin: sessões abertas com a senha antiga são encerradas.
    await new SessionService().revokeAll(userId);

    return await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  private async countOwnedContent(userId: string) {
    const [courses, learningPaths] = await Promise.all([
      prisma.course.count({ where: { instructorId: userId } }),
      prisma.learningPath.count({ where: { instructorId: userId } }),
    ]);
    return { courses, learningPaths };
  }

  /** Transfere todos os cursos e trilhas de um usuário para outro instrutor/admin. */
  async transferContent(fromUserId: string, toUserId: string, requesterId: string) {
    if (fromUserId === toUserId) {
      throw new HttpError(400, "Selecione um destinatário diferente do usuário de origem");
    }

    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: fromUserId }, select: { id: true, name: true } }),
      prisma.user.findUnique({ where: { id: toUserId }, select: { id: true, name: true, role: true } }),
    ]);

    if (!fromUser || !toUser) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    if (toUser.role !== "INSTRUCTOR" && toUser.role !== "ADMIN") {
      throw new HttpError(400, "O destinatário precisa ser um instrutor ou administrador");
    }

    const [courses, learningPaths] = await prisma.$transaction([
      prisma.course.updateMany({ where: { instructorId: fromUserId }, data: { instructorId: toUserId } }),
      prisma.learningPath.updateMany({ where: { instructorId: fromUserId }, data: { instructorId: toUserId } }),
    ]);

    await logActivity({
      action: "USER_UPDATED",
      description: `${courses.count} curso(s) e ${learningPaths.count} trilha(s) transferidos de "${fromUser.name}" para "${toUser.name}"`,
      resourceId: fromUserId,
      resourceType: "USER",
      userId: requesterId,
    });

    return { coursesTransferred: courses.count, learningPathsTransferred: learningPaths.count };
  }

  async deleteUser(userId: string, requesterId: string) {
    if (userId === requesterId) {
      throw new HttpError(400, "Você não pode excluir a sua própria conta de administrador");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    // Cursos não podem ficar sem instrutor e trilhas seriam apagadas em cascata:
    // o conteúdo precisa ser transferido antes da exclusão.
    const owned = await this.countOwnedContent(userId);
    if (owned.courses + owned.learningPaths > 0) {
      throw new HttpError(400, 
        `Este usuário é autor de ${owned.courses} curso(s) e ${owned.learningPaths} trilha(s). ` +
          "Transfira o conteúdo para outro instrutor antes de excluir o usuário."
      );
    }

    const userName = user.name;
    const userEmail = user.email;
    await prisma.user.delete({
      where: { id: userId },
    });

    await logActivity({
      action: "USER_DELETED",
      description: `Usuário "${userName}" (${userEmail}) deletado`,
      resourceId: userId,
      resourceType: "USER",
      userId: requesterId,
    });

    return { message: "Usuário deletado com sucesso" };
  }
}


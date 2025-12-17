import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";

export class EnrollmentService {
  async enroll(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    if (course.status !== "PUBLISHED") {
      const statusMessages: Record<string, string> = {
        DRAFT: "Curso ainda não está publicado",
        ARCHIVED: "Curso foi arquivado e não aceita novas matrículas",
        SUSPENDED: "Curso está suspenso e não aceita novas matrículas",
      };
      throw new Error(statusMessages[course.status] || "Curso não está disponível para matrícula");
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existing) {
      throw new Error("Você já está matriculado neste curso");
    }

    const enrollment = await prisma.enrollment.create({
      data: { userId, courseId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log de atividade
    await logActivity({
      action: "ENROLLMENT_CREATED",
      description: `Matrícula no curso "${enrollment.course.title}"`,
      resourceId: enrollment.id,
      resourceType: "ENROLLMENT",
      userId,
    });

    return enrollment;
  }

  async getMyEnrollments(userId: string) {
    return await prisma.enrollment.findMany({
      where: { userId },
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
            modules: {
              include: {
                _count: {
                  select: { lessons: true },
                },
              },
            },
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });
  }

  async cancelEnrollment(userId: string, courseId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw new Error("Matrícula não encontrada");
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { title: true },
    });

    await prisma.enrollment.delete({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    // Log de atividade
    await logActivity({
      action: "ENROLLMENT_DELETED",
      description: `Matrícula cancelada no curso "${course?.title || courseId}"`,
      resourceId: courseId,
      resourceType: "ENROLLMENT",
      userId,
    });
  }
}


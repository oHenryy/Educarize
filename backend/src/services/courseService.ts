import { prisma } from "../config/database";
import { CourseStatus, Difficulty } from "@prisma/client";
import { logActivity } from "../utils/activityLogger";
import { isEnumValue } from "../utils/enums";
import { HttpError } from "../utils/httpError";
import { AuthUser, isOwnerOrAdmin, isEnrolled } from "../utils/courseAccess";

export interface CourseFilters {
  categoryId?: string;
  difficulty?: string;
  status?: string;
  search?: string;
  instructorId?: string;
}

export interface CreateCourseData {
  title: string;
  description?: string;
  coverImageUrl?: string;
  durationHours?: number;
  difficulty?: string;
  categoryId?: string;
  instructorId: string;
}

export interface UpdateCourseData {
  title?: string;
  description?: string;
  coverImageUrl?: string;
  durationHours?: number;
  difficulty?: string;
  categoryId?: string | null;
  status?: string;
}

export class CourseService {
  async listCourses(filters: CourseFilters, user: AuthUser, page = 1, limit = 20) {
    const where: any = {};

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.instructorId) where.instructorId = filters.instructorId;

    // Cursos não publicados só são visíveis para administradores ou para o próprio instrutor.
    const canSeeUnpublished =
      user.role === "ADMIN" || (!!filters.instructorId && filters.instructorId === user.userId);
    if (canSeeUnpublished) {
      if (filters.status) where.status = filters.status;
    } else {
      where.status = "PUBLISHED";
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    // Listagem paginada e enxuta: a estrutura de módulos/aulas só é carregada em GET /courses/:id.
    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
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
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    return {
      courses,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getCourseById(id: string, user: AuthUser) {
    const course = await prisma.course.findUnique({
      where: { id },
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
            lessons: {
              include: {
                _count: {
                  select: {
                    attachments: true,
                  },
                },
              },
              orderBy: {
                order: "asc",
              },
            },
            quiz: {
              include: {
                _count: {
                  select: {
                    questions: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: "asc",
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
    });

    if (!course) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (isOwnerOrAdmin(course.instructorId, user)) {
      return course;
    }

    const enrolled = await isEnrolled(user.userId, id);

    // Rascunhos/suspensos/arquivados não são visíveis para quem não está matriculado.
    if (course.status !== "PUBLISHED" && !enrolled) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (enrolled) {
      return course;
    }

    // Quem não está matriculado vê apenas a ementa, sem o link dos vídeos.
    return {
      ...course,
      modules: course.modules.map((mod) => ({
        ...mod,
        lessons: mod.lessons.map((lesson) => ({ ...lesson, videoUrl: null })),
      })),
    };
  }

  async createCourse(data: CreateCourseData) {
    let finalCategoryId: string | null = null;
    if (data.categoryId && data.categoryId.trim() !== "") {
      const category = await prisma.courseCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new HttpError(404, "Categoria não encontrada");
      }

      finalCategoryId = data.categoryId;
    }

    const finalDifficulty: Difficulty = isEnumValue(Difficulty, data.difficulty) ? data.difficulty : "BEGINNER";

    try {
      const course = await prisma.course.create({
        data: {
          title: data.title,
          description: data.description,
          coverImageUrl: data.coverImageUrl,
          durationHours: data.durationHours || 0,
          difficulty: finalDifficulty,
          instructorId: data.instructorId,
          categoryId: finalCategoryId,
          status: "DRAFT",
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
      });

      await logActivity({
        action: "COURSE_CREATED",
        description: `Curso "${course.title}" criado`,
        resourceId: course.id,
        resourceType: "COURSE",
        userId: data.instructorId,
      });

      return course;
    } catch (error: any) {
      if (error.code === "P2003") {
        throw new HttpError(400, "Referência inválida. Verifique se a categoria existe ou se o instrutor é válido.");
      }
      throw error;
    }
  }

  async updateCourse(id: string, data: UpdateCourseData, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar este curso");
    }

    let finalCategoryId: string | null | undefined = undefined;
    if (data.categoryId !== undefined) {
      if (data.categoryId === null || data.categoryId === "" || data.categoryId.trim() === "") {
        finalCategoryId = null;
      } else {
        const category = await prisma.courseCategory.findUnique({
          where: { id: data.categoryId },
        });

        if (!category) {
          throw new HttpError(404, "Categoria não encontrada");
        }

        finalCategoryId = data.categoryId;
      }
    }

    let finalDifficulty: Difficulty | undefined = undefined;
    if (data.difficulty) {
      if (!isEnumValue(Difficulty, data.difficulty)) {
        throw new HttpError(400, "Dificuldade inválida. Use: BEGINNER, INTERMEDIATE ou ADVANCED");
      }
      finalDifficulty = data.difficulty;
    }

    let finalStatus: CourseStatus | undefined = undefined;
    if (data.status) {
      if (!isEnumValue(CourseStatus, data.status)) {
        throw new HttpError(400, "Status inválido. Use: DRAFT, PUBLISHED, ARCHIVED ou SUSPENDED");
      }
      // Suspensão é uma ação administrativa: instrutor não pode suspender nem reativar curso suspenso.
      if (userRole !== "ADMIN" && data.status !== course.status &&
          (data.status === "SUSPENDED" || course.status === "SUSPENDED")) {
        throw new HttpError(403, "Sem permissão: apenas administradores podem suspender ou reativar cursos suspensos");
      }
      finalStatus = data.status;
    }

    try {
      const updated = await prisma.course.update({
        where: { id },
        data: {
          ...(data.title && { title: data.title }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
          ...(data.durationHours !== undefined && { durationHours: data.durationHours }),
          ...(finalDifficulty && { difficulty: finalDifficulty }),
          ...(finalCategoryId !== undefined && { categoryId: finalCategoryId }),
          ...(finalStatus && { status: finalStatus }),
        },
        include: {
          instructor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
          category: true,
        },
      });

      await logActivity({
        action: "COURSE_UPDATED",
        description: `Curso "${updated.title}" atualizado`,
        resourceId: updated.id,
        resourceType: "COURSE",
        userId,
      });

      return updated;
    } catch (error: any) {
      if (error.code === "P2003") {
        throw new HttpError(400, "Referência inválida. Verifique se a categoria existe.");
      }
      throw error;
    }
  }

  async deleteCourse(id: string, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar este curso");
    }

    const courseTitle = course.title;
    await prisma.course.delete({
      where: { id },
    });

    await logActivity({
      action: "COURSE_DELETED",
      description: `Curso "${courseTitle}" deletado`,
      resourceId: id,
      resourceType: "COURSE",
      userId,
    });
  }

  async getCourseStudents(id: string, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para ver alunos deste curso");
    }

    return await prisma.enrollment.findMany({
      where: { courseId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });
  }
}


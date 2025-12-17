import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";

export interface CourseFilters {
  categoryId?: string;
  difficulty?: string;
  status?: string;
  search?: string;
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
  async listCourses(filters: CourseFilters) {
    const where: any = {};

    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }

    return await prisma.course.findMany({
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
        modules: {
          include: {
            _count: {
              select: {
                lessons: true,
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async getCourseById(id: string) {
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
      throw new Error("Curso não encontrado");
    }

    return course;
  }

  async createCourse(data: CreateCourseData) {
    let finalCategoryId: string | null = null;
    if (data.categoryId && data.categoryId.trim() !== "") {
      const category = await prisma.courseCategory.findUnique({
        where: { id: data.categoryId },
      });

      if (!category) {
        throw new Error("Categoria não encontrada");
      }

      finalCategoryId = data.categoryId;
    }

    const validDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
    const finalDifficulty =
      data.difficulty && validDifficulties.includes(data.difficulty)
        ? data.difficulty
        : "BEGINNER";

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
        throw new Error("Referência inválida. Verifique se a categoria existe ou se o instrutor é válido.");
      }
      throw error;
    }
  }

  async updateCourse(id: string, data: UpdateCourseData, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    // Verificar permissão
    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para editar este curso");
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
          throw new Error("Categoria não encontrada");
        }

        finalCategoryId = data.categoryId;
      }
    }

    let finalDifficulty: string | undefined = undefined;
    if (data.difficulty) {
      const validDifficulties = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
      if (validDifficulties.includes(data.difficulty)) {
        finalDifficulty = data.difficulty;
      } else {
        throw new Error("Dificuldade inválida. Use: BEGINNER, INTERMEDIATE ou ADVANCED");
      }
    }

    let finalStatus: string | undefined = undefined;
    if (data.status) {
      const validStatuses = ["DRAFT", "PUBLISHED", "ARCHIVED", "SUSPENDED"];
      if (validStatuses.includes(data.status)) {
        finalStatus = data.status;
      } else {
        throw new Error("Status inválido. Use: DRAFT, PUBLISHED, ARCHIVED ou SUSPENDED");
      }
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

      return updated;
    } catch (error: any) {
      if (error.code === "P2003") {
        throw new Error("Referência inválida. Verifique se a categoria existe.");
      }
      throw error;
    }
  }

  async deleteCourse(id: string, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    // Verificar permissão
    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar este curso");
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
      throw new Error("Curso não encontrado");
    }

    // Verificar permissão
    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para ver alunos deste curso");
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


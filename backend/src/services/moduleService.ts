import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";

export class ModuleService {
  async listByCourse(courseId: string) {
    return await prisma.module.findMany({
      where: { courseId },
      include: {
        lessons: { orderBy: { order: "asc" } },
        quiz: {
          include: {
            _count: { select: { questions: true } },
          },
        },
      },
      orderBy: { order: "asc" },
    });
  }

  async create(data: { title: string; description?: string; order?: number; courseId: string }, userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id: data.courseId },
    });

    if (!course) {
      throw new Error("Curso não encontrado");
    }

    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para criar módulo neste curso");
    }

    const module = await prisma.module.create({
      data: {
        title: data.title,
        description: data.description,
        order: data.order || 0,
        courseId: data.courseId,
      },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
    });

    // Log de atividade
    await logActivity({
      action: "MODULE_CREATED",
      description: `Módulo "${module.title}" criado no curso "${module.course.title}"`,
      resourceId: module.id,
      resourceType: "MODULE",
      userId,
    });

    return module;
  }

  async update(id: string, data: { title?: string; description?: string; order?: number }, userId: string, userRole: string) {
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!module) {
      throw new Error("Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para editar este módulo");
    }

    const updated = await prisma.module.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    // Log de atividade
    await logActivity({
      action: "MODULE_UPDATED",
      description: `Módulo "${updated.title}" atualizado`,
      resourceId: updated.id,
      resourceType: "MODULE",
      userId,
    });

    return updated;
  }

  async delete(id: string, userId: string, userRole: string) {
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!module) {
      throw new Error("Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar este módulo");
    }

    const moduleTitle = module.title;
    await prisma.module.delete({ where: { id } });

    await logActivity({
      action: "MODULE_DELETED",
      description: `Módulo "${moduleTitle}" deletado`,
      resourceId: id,
      resourceType: "MODULE",
      userId,
    });
  }
}


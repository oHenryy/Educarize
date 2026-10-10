import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { AuthUser, assertCourseContentAccess } from "../utils/courseAccess";
import { HttpError } from "../utils/httpError";
import { isSameIdSet } from "../utils";
import { FileService } from "./fileService";

const fileService = new FileService();

export class ModuleService {
  async listByCourse(courseId: string, user: AuthUser) {
    await assertCourseContentAccess(courseId, user);

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
      throw new HttpError(404, "Curso não encontrado");
    }

    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para criar módulo neste curso");
    }

    const module = await prisma.module.create({
      data: {
        title: data.title,
        description: data.description,
        order: data.order ?? 0,
        courseId: data.courseId,
      },
      include: {
        course: {
          select: { id: true, title: true },
        },
      },
    });

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
      throw new HttpError(404, "Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar este módulo");
    }

    const updated = await prisma.module.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    await logActivity({
      action: "MODULE_UPDATED",
      description: `Módulo "${updated.title}" atualizado`,
      resourceId: updated.id,
      resourceType: "MODULE",
      userId,
    });

    return updated;
  }

  /** Reordena todos os módulos do curso de uma vez (ordem = posição na lista). */
  async reorder(courseId: string, moduleIds: string[], userId: string, userRole: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { instructorId: true, modules: { select: { id: true } } },
    });

    if (!course) {
      throw new HttpError(404, "Curso não encontrado");
    }

    if (course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para reordenar os módulos deste curso");
    }

    if (!isSameIdSet(course.modules.map((m) => m.id), moduleIds)) {
      throw new HttpError(400, "A lista deve conter exatamente os módulos atuais do curso");
    }

    await prisma.$transaction(
      moduleIds.map((id, index) => prisma.module.update({ where: { id }, data: { order: index } }))
    );

    return this.listByCourse(courseId, { userId, role: userRole });
  }

  async delete(id: string, userId: string, userRole: string) {
    const module = await prisma.module.findUnique({
      where: { id },
      include: { course: true },
    });

    if (!module) {
      throw new HttpError(404, "Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar este módulo");
    }

    const moduleTitle = module.title;
    const fileIds = await fileService.attachmentFileIds({ lesson: { moduleId: id } });
    await prisma.module.delete({ where: { id } });
    await fileService.deleteAllIfUnused(fileIds);

    await logActivity({
      action: "MODULE_DELETED",
      description: `Módulo "${moduleTitle}" deletado`,
      resourceId: id,
      resourceType: "MODULE",
      userId,
    });
  }
}


import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { HttpError } from "../utils/httpError";
import { isSafeUrl } from "../utils";
import {
  AuthUser,
  assertCourseContentAccess,
  getCourseIdByLesson,
  getCourseIdByModule,
} from "../utils/courseAccess";

function assertSafeUrl(url: string | null | undefined, field: string): void {
  if (url && !isSafeUrl(url)) {
    throw new HttpError(400, `${field} inválido: use um endereço http:// ou https://`);
  }
}

export class LessonService {
  async listByModule(moduleId: string, user: AuthUser) {
    await assertCourseContentAccess(await getCourseIdByModule(moduleId), user);

    return await prisma.lesson.findMany({
      where: { moduleId },
      include: {
        attachments: true,
        _count: { select: { comments: true } },
      },
      orderBy: { order: "asc" },
    });
  }

  async getById(id: string, user: AuthUser) {
    await assertCourseContentAccess(await getCourseIdByLesson(id), user);

    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: {
            course: {
              select: {
                id: true,
                title: true,
                instructorId: true,
              },
            },
          },
        },
        attachments: true,
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
          where: { parentId: null },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lesson) {
      throw new HttpError(404, "Aula não encontrada");
    }

    return lesson;
  }

  async create(
    data: {
      title: string;
      description?: string;
      videoUrl?: string;
      durationMinutes?: number;
      order?: number;
      moduleId: string;
    },
    userId: string,
    userRole: string
  ) {
    const module = await prisma.module.findUnique({
      where: { id: data.moduleId },
      include: { course: true },
    });

    if (!module) {
      throw new HttpError(404, "Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para criar aula neste módulo");
    }

    assertSafeUrl(data.videoUrl, "Link do vídeo");

    const lesson = await prisma.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl || null,
        durationMinutes: data.durationMinutes || 0,
        order: data.order ?? 0,
        moduleId: data.moduleId,
      },
      include: {
        module: {
          select: { id: true, title: true },
        },
      },
    });

    await logActivity({
      action: "LESSON_CREATED",
      description: `Aula "${lesson.title}" criada no módulo "${lesson.module.title}"`,
      resourceId: lesson.id,
      resourceType: "LESSON",
      userId,
    });

    return lesson;
  }

  async update(
    id: string,
    data: {
      title?: string;
      description?: string;
      videoUrl?: string;
      durationMinutes?: number;
      order?: number;
    },
    userId: string,
    userRole: string
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new HttpError(404, "Aula não encontrada");
    }

    if (lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar esta aula");
    }

    assertSafeUrl(data.videoUrl, "Link do vídeo");

    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    await logActivity({
      action: "LESSON_UPDATED",
      description: `Aula "${updated.title}" atualizada`,
      resourceId: updated.id,
      resourceType: "LESSON",
      userId,
    });

    return updated;
  }

  async delete(id: string, userId: string, userRole: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id },
      include: {
        module: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new HttpError(404, "Aula não encontrada");
    }

    if (lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar esta aula");
    }

    const lessonTitle = lesson.title;
    await prisma.lesson.delete({ where: { id } });

    await logActivity({
      action: "LESSON_DELETED",
      description: `Aula "${lessonTitle}" deletada`,
      resourceId: id,
      resourceType: "LESSON",
      userId,
    });
  }

  async addAttachment(
    lessonId: string,
    data: {
      name: string;
      description?: string;
      fileUrl: string;
      fileType: string;
      fileSize?: number;
      category?: string;
      order?: number;
      thumbnailUrl?: string;
    },
    userId: string,
    userRole: string
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: { course: true },
        },
      },
    });

    if (!lesson) {
      throw new HttpError(404, "Aula não encontrada");
    }

    if (lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para adicionar anexo nesta aula");
    }

    assertSafeUrl(data.fileUrl, "Link do arquivo");
    assertSafeUrl(data.thumbnailUrl, "Link da miniatura");

    const maxOrder = await prisma.lessonAttachment.findFirst({
      where: { lessonId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    return await prisma.lessonAttachment.create({
      data: {
        name: data.name,
        description: data.description,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        category: data.category,
        order: data.order ?? (maxOrder ? maxOrder.order + 1 : 0),
        thumbnailUrl: data.thumbnailUrl,
        lessonId,
      },
    });
  }

  async updateAttachment(
    attachmentId: string,
    data: {
      name?: string;
      description?: string;
      fileUrl?: string;
      fileType?: string;
      fileSize?: number;
      category?: string;
      order?: number;
      thumbnailUrl?: string;
    },
    userId: string,
    userRole: string
  ) {
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        lesson: {
          include: {
            module: {
              include: { course: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new HttpError(404, "Anexo não encontrado");
    }

    if (attachment.lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar este anexo");
    }

    assertSafeUrl(data.fileUrl, "Link do arquivo");
    assertSafeUrl(data.thumbnailUrl, "Link da miniatura");

    return await prisma.lessonAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.fileUrl && { fileUrl: data.fileUrl }),
        ...(data.fileType && { fileType: data.fileType }),
        ...(data.fileSize !== undefined && { fileSize: data.fileSize }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.order !== undefined && { order: data.order }),
        ...(data.thumbnailUrl !== undefined && { thumbnailUrl: data.thumbnailUrl }),
      },
    });
  }

  async incrementAttachmentDownload(attachmentId: string, user: AuthUser) {
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      select: { lessonId: true },
    });
    if (!attachment) {
      throw new HttpError(404, "Anexo não encontrado");
    }
    await assertCourseContentAccess(await getCourseIdByLesson(attachment.lessonId), user);

    await prisma.lessonAttachment.update({
      where: { id: attachmentId },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  }

  async getAttachmentsByLesson(lessonId: string, user: AuthUser, category?: string) {
    await assertCourseContentAccess(await getCourseIdByLesson(lessonId), user);

    const where: any = { lessonId };
    if (category) {
      where.category = category;
    }

    return await prisma.lessonAttachment.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  }

  async deleteAttachment(attachmentId: string, userId: string, userRole: string) {
    const attachment = await prisma.lessonAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        lesson: {
          include: {
            module: {
              include: { course: true },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new HttpError(404, "Anexo não encontrado");
    }

    if (attachment.lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar este anexo");
    }

    await prisma.lessonAttachment.delete({
      where: { id: attachmentId },
    });
  }
}


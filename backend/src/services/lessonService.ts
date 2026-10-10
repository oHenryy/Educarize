import { prisma } from "../config/database";
import { logActivity } from "../utils/activityLogger";
import { HttpError } from "../utils/httpError";
import { isSafeUrl, isSameIdSet } from "../utils";
import { FileService, fileKind, fileUrl } from "./fileService";

const fileService = new FileService();
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

  /** Reordena todas as aulas do módulo de uma vez (ordem = posição na lista). */
  async reorder(moduleId: string, lessonIds: string[], userId: string, userRole: string) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: { course: { select: { instructorId: true } }, lessons: { select: { id: true } } },
    });

    if (!module) {
      throw new HttpError(404, "Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para reordenar as aulas deste módulo");
    }

    if (!isSameIdSet(module.lessons.map((l) => l.id), lessonIds)) {
      throw new HttpError(400, "A lista deve conter exatamente as aulas atuais do módulo");
    }

    await prisma.$transaction(
      lessonIds.map((id, index) => prisma.lesson.update({ where: { id }, data: { order: index } }))
    );

    return this.listByModule(moduleId, { userId, role: userRole });
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
    const fileIds = await fileService.attachmentFileIds({ lessonId: id });
    await prisma.lesson.delete({ where: { id } });
    await fileService.deleteAllIfUnused(fileIds);

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
      fileId?: string;
      fileUrl?: string;
      fileType?: string;
      fileSize?: number;
      category?: string;
      order?: number;
      thumbnailUrl?: string;
    },
    userId: string,
    userRole: string,
    requestOrigin = ""
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

    // Arquivo enviado ao Educarize: link, tipo e tamanho vêm do próprio arquivo.
    if (data.fileId) {
      const file = await fileService.assertUsable(data.fileId, "ATTACHMENT", { userId, role: userRole });
      data = { ...data, fileUrl: fileUrl(file.id, requestOrigin), fileType: fileKind(file), fileSize: file.size };
    }
    if (!data.fileUrl || !data.fileType) {
      throw new HttpError(400, "Envie um arquivo ou informe o link e o tipo do arquivo");
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
        fileId: data.fileId,
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

    // Trocar o link de um anexo enviado o transforma em link externo: o arquivo antigo é descartado.
    const replacesFile = !!attachment.fileId && !!data.fileUrl && data.fileUrl !== attachment.fileUrl;

    const updated = await prisma.lessonAttachment.update({
      where: { id: attachmentId },
      data: {
        ...(replacesFile && { fileId: null }),
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
    if (replacesFile) await fileService.deleteIfUnused(attachment.fileId);
    return updated;
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
    await fileService.deleteIfUnused(attachment.fileId);
  }
}


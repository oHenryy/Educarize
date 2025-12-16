import { prisma } from "../config/database";

export class LessonService {
  async listByModule(moduleId: string) {
    return await prisma.lesson.findMany({
      where: { moduleId },
      include: {
        attachments: true,
        _count: { select: { comments: true } },
      },
      orderBy: { order: "asc" },
    });
  }

  async getById(id: string) {
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
      throw new Error("Aula não encontrada");
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
      throw new Error("Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para criar aula neste módulo");
    }

    return await prisma.lesson.create({
      data: {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        durationMinutes: data.durationMinutes || 0,
        order: data.order || 0,
        moduleId: data.moduleId,
      },
      include: {
        module: {
          select: { id: true, title: true },
        },
      },
    });
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
      throw new Error("Aula não encontrada");
    }

    if (lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para editar esta aula");
    }

    return await prisma.lesson.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.videoUrl !== undefined && { videoUrl: data.videoUrl }),
        ...(data.durationMinutes !== undefined && { durationMinutes: data.durationMinutes }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });
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
      throw new Error("Aula não encontrada");
    }

    if (lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar esta aula");
    }

    await prisma.lesson.delete({ where: { id } });
  }

  async addAttachment(
    lessonId: string,
    data: { name: string; fileUrl: string; fileType: string; fileSize?: number },
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
      throw new Error("Aula não encontrada");
    }

    if (lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para adicionar anexo nesta aula");
    }

    return await prisma.lessonAttachment.create({
      data: {
        name: data.name,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        fileSize: data.fileSize,
        lessonId,
      },
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
      throw new Error("Anexo não encontrado");
    }

    if (attachment.lesson.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar este anexo");
    }

    await prisma.lessonAttachment.delete({
      where: { id: attachmentId },
    });
  }
}


import { prisma } from "../config/database";
import { NotificationService } from "./notificationService";
import { HttpError } from "../utils/httpError";
import { AuthUser, assertCourseContentAccess, getCourseIdByLesson } from "../utils/courseAccess";

export class CommentService {
  async listByLesson(lessonId: string, user: AuthUser) {
    await assertCourseContentAccess(await getCourseIdByLesson(lessonId), user);

    const comments = await prisma.lessonComment.findMany({
      where: {
        lessonId,
        parentId: null,
      },
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
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return comments;
  }

  async create(
    lessonId: string,
    user: AuthUser,
    content: string,
    parentId?: string
  ) {
    const userId = user.userId;
    await assertCourseContentAccess(await getCourseIdByLesson(lessonId), user);

    if (parentId) {
      const parent = await prisma.lessonComment.findUnique({
        where: { id: parentId },
        select: { lessonId: true, parentId: true },
      });
      if (!parent || parent.lessonId !== lessonId) {
        throw new HttpError(400, "Comentário pai inválido para esta aula");
      }
      // Respostas ficam em um único nível: responder a uma resposta vira resposta ao comentário original.
      if (parent.parentId) {
        parentId = parent.parentId;
      }
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        module: {
          select: {
            course: {
              select: {
                id: true,
                title: true,
                instructorId: true,
              },
            },
          },
        },
      },
    });

    const comment = await prisma.lessonComment.create({
      data: {
        content,
        lessonId,
        userId,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        parent: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                name: true,
              },
            },
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
    });

    const notificationService = new NotificationService();

    if (parentId && comment.parent) {
      const parentComment = comment.parent;
      if (parentComment.userId !== userId) {
        await notificationService.createNotification(
          parentComment.userId,
          "Nova resposta no seu comentário",
          `${comment.user.name} respondeu seu comentário na aula "${lesson?.title || "Aula"}" do curso "${lesson?.module.course.title || "Curso"}".`,
          "INFO"
        ).catch(err => console.error("Erro ao criar notificação de resposta:", err));
      }
    } else if (lesson && lesson.module.course.instructorId && lesson.module.course.instructorId !== userId) {
      await notificationService.createNotification(
        lesson.module.course.instructorId,
        "Novo comentário na sua aula",
        `${comment.user.name} comentou na aula "${lesson.title}" do curso "${lesson.module.course.title}".`,
        "INFO"
      ).catch(err => console.error("Erro ao criar notificação para instrutor:", err));
    }

    return comment;
  }

  async update(commentId: string, userId: string, content: string) {
    const existing = await prisma.lessonComment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      throw new Error("Comentário não encontrado");
    }

    if (existing.userId !== userId) {
      throw new Error("Sem permissão para editar este comentário");
    }

    const updated = await prisma.lessonComment.update({
      where: { id: commentId },
      data: { content },
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
    });

    return updated;
  }

  async delete(commentId: string, userId: string, role: string) {
    const existing = await prisma.lessonComment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      throw new Error("Comentário não encontrado");
    }

    if (existing.userId !== userId && role !== "ADMIN") {
      throw new Error("Sem permissão para deletar este comentário");
    }

    // Remove as respostas junto, para não virarem comentários "órfãos" no nível principal.
    await prisma.$transaction([
      prisma.lessonComment.deleteMany({ where: { parentId: commentId } }),
      prisma.lessonComment.delete({ where: { id: commentId } }),
    ]);

    return { message: "Comentário deletado com sucesso" };
  }
}


import { prisma } from "../config/database";

export class CommentService {
  async listByLesson(lessonId: string) {
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
    userId: string,
    content: string,
    parentId?: string
  ) {
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

    return comment;
  }

  async update(commentId: string, userId: string, content: string) {
    // Verificar se o comentário pertence ao usuário
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

    await prisma.lessonComment.delete({
      where: { id: commentId },
    });

    return { message: "Comentário deletado com sucesso" };
  }
}


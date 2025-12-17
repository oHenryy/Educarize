import { prisma } from "../config/database";

export class NoteService {
  async createNote(userId: string, lessonId: string, content: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new Error("Aula não encontrada");
    }

    return await prisma.note.create({
      data: {
        userId,
        lessonId,
        content,
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateNote(noteId: string, userId: string, content: string) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error("Anotação não encontrada");
    }

    if (note.userId !== userId) {
      throw new Error("Sem permissão para editar esta anotação");
    }

    return await prisma.note.update({
      where: { id: noteId },
      data: { content },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async deleteNote(noteId: string, userId: string) {
    const note = await prisma.note.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new Error("Anotação não encontrada");
    }

    if (note.userId !== userId) {
      throw new Error("Sem permissão para deletar esta anotação");
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    return { message: "Anotação deletada com sucesso" };
  }

  async getLessonNotes(userId: string, lessonId: string) {
    return await prisma.note.findMany({
      where: {
        userId,
        lessonId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getMyNotes(userId: string, search?: string) {
    const where: any = { userId };

    if (search) {
      where.content = {
        contains: search,
      };
    }

    return await prisma.note.findMany({
      where,
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}


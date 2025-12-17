import { prisma } from "../config/database";

export class QuizService {
  async getByModule(moduleId: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { moduleId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      throw new Error("Quiz não encontrado");
    }

    const quizWithParsedOptions = {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options),
      })),
    };

    return quizWithParsedOptions;
  }

  async create(
    moduleId: string,
    data: { title: string; description?: string; passingScore?: number },
    userId: string,
    userRole: string
  ) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        course: {
          select: {
            instructorId: true,
          },
        },
      },
    });

    if (!module) {
      throw new Error("Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para criar quiz neste módulo");
    }

    const existing = await prisma.quiz.findUnique({
      where: { moduleId },
    });

    if (existing) {
      throw new Error("Já existe um quiz para este módulo");
    }

    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        passingScore: data.passingScore || 70,
        moduleId,
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return {
      ...quiz,
      questions: quiz.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options),
      })),
    };
  }

  async update(
    quizId: string,
    data: { title?: string; description?: string; passingScore?: number },
    userId: string,
    userRole: string
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: {
            course: {
              select: {
                instructorId: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new Error("Quiz não encontrado");
    }

    if (quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para editar este quiz");
    }

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.passingScore !== undefined && { passingScore: data.passingScore }),
      },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    return {
      ...updated,
      questions: updated.questions.map((q) => ({
        ...q,
        options: JSON.parse(q.options),
      })),
    };
  }

  async delete(quizId: string, userId: string, userRole: string) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: {
            course: {
              select: {
                instructorId: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new Error("Quiz não encontrado");
    }

    if (quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar este quiz");
    }

    await prisma.quiz.delete({
      where: { id: quizId },
    });

    return { message: "Quiz deletado com sucesso" };
  }

  async addQuestion(
    quizId: string,
    data: {
      question: string;
      options: string[];
      correctAnswer: number;
      order?: number;
    },
    userId: string,
    userRole: string
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        module: {
          include: {
            course: {
              select: {
                instructorId: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new Error("Quiz não encontrado");
    }

    if (quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para adicionar questões neste quiz");
    }

    if (data.correctAnswer < 0 || data.correctAnswer >= data.options.length) {
      throw new Error("Resposta correta inválida");
    }

    const question = await prisma.quizQuestion.create({
      data: {
        question: data.question,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        order: data.order || 0,
        quizId,
      },
    });

    return {
      ...question,
      options: JSON.parse(question.options),
    };
  }

  async updateQuestion(
    questionId: string,
    data: {
      question?: string;
      options?: string[];
      correctAnswer?: number;
      order?: number;
    },
    userId: string,
    userRole: string
  ) {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    instructorId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw new Error("Questão não encontrada");
    }

    if (question.quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para editar esta questão");
    }

    if (data.options && data.correctAnswer !== undefined) {
      if (data.correctAnswer < 0 || data.correctAnswer >= data.options.length) {
        throw new Error("Resposta correta inválida");
      }
    }

    const updated = await prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        ...(data.question && { question: data.question }),
        ...(data.options && { options: JSON.stringify(data.options) }),
        ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return {
      ...updated,
      options: JSON.parse(updated.options),
    };
  }

  async deleteQuestion(questionId: string, userId: string, userRole: string) {
    const question = await prisma.quizQuestion.findUnique({
      where: { id: questionId },
      include: {
        quiz: {
          include: {
            module: {
              include: {
                course: {
                  select: {
                    instructorId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw new Error("Questão não encontrada");
    }

    if (question.quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new Error("Sem permissão para deletar esta questão");
    }

    await prisma.quizQuestion.delete({
      where: { id: questionId },
    });

    return { message: "Questão deletada com sucesso" };
  }

  async submitAttempt(
    quizId: string,
    userId: string,
    answers: { [questionId: string]: number }
  ) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      throw new Error("Quiz não encontrado");
    }

    // Parse options JSON para array antes de calcular
    const questionsWithParsedOptions = quiz.questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options),
    }));

    // Calcular pontuação
    let correct = 0;
    const totalQuestions = questionsWithParsedOptions.length;

    for (const question of questionsWithParsedOptions) {
      const userAnswer = answers[question.id];
      if (userAnswer !== undefined && userAnswer === question.correctAnswer) {
        correct++;
      }
    }

    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const passed = score >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answers: JSON.stringify(answers),
        score,
        passed,
      },
    });

    return attempt;
  }

  async getAttempts(quizId: string, userId: string) {
    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId,
      },
      orderBy: {
        completedAt: "desc",
      },
    });

    return attempts;
  }
}


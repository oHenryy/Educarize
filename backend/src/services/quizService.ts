import { prisma } from "../config/database";
import { NotificationService } from "./notificationService";
import { HttpError } from "../utils/httpError";
import {
  AuthUser,
  assertCourseContentAccess,
  getCourseIdByQuiz,
  isOwnerOrAdmin,
} from "../utils/courseAccess";

function validatePassingScore(passingScore: unknown): void {
  if (passingScore === undefined || passingScore === null) return;
  if (typeof passingScore !== "number" || !Number.isInteger(passingScore) || passingScore < 0 || passingScore > 100) {
    throw new HttpError(400, "Nota mínima deve ser um número inteiro entre 0 e 100");
  }
}

export class QuizService {
  async getByModule(moduleId: string, user: AuthUser) {
    const quiz = await prisma.quiz.findUnique({
      where: { moduleId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
        module: { select: { courseId: true, course: { select: { instructorId: true } } } },
      },
    });

    if (!quiz) {
      throw new HttpError(404, "Quiz não encontrado");
    }

    await assertCourseContentAccess(quiz.module.courseId, user);

    // O gabarito só é enviado para o dono do curso ou administradores.
    const canSeeAnswers = isOwnerOrAdmin(quiz.module.course.instructorId, user);
    const { module: _module, ...quizData } = quiz;

    return {
      ...quizData,
      questions: quiz.questions.map(({ correctAnswer, ...q }) => ({
        ...q,
        options: JSON.parse(q.options),
        ...(canSeeAnswers && { correctAnswer }),
      })),
    };
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
      throw new HttpError(404, "Módulo não encontrado");
    }

    if (module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para criar quiz neste módulo");
    }

    const existing = await prisma.quiz.findUnique({
      where: { moduleId },
    });

    if (existing) {
      throw new HttpError(409, "Já existe um quiz para este módulo");
    }

    validatePassingScore(data.passingScore);

    const quiz = await prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        passingScore: data.passingScore ?? 70,
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
      throw new HttpError(404, "Quiz não encontrado");
    }

    if (quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar este quiz");
    }

    validatePassingScore(data.passingScore);

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
      throw new HttpError(404, "Quiz não encontrado");
    }

    if (quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar este quiz");
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
      throw new HttpError(404, "Quiz não encontrado");
    }

    if (quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para adicionar questões neste quiz");
    }

    if (
      !Number.isInteger(data.correctAnswer) ||
      data.correctAnswer < 0 ||
      data.correctAnswer >= data.options.length
    ) {
      throw new HttpError(400, "Resposta correta inválida");
    }

    const question = await prisma.quizQuestion.create({
      data: {
        question: data.question,
        options: JSON.stringify(data.options),
        correctAnswer: data.correctAnswer,
        order: data.order ?? 0,
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
      throw new HttpError(404, "Questão não encontrada");
    }

    if (question.quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para editar esta questão");
    }

    // Valida a combinação final (opções novas ou existentes x resposta nova ou existente).
    if (data.options !== undefined || data.correctAnswer !== undefined) {
      const finalOptions: string[] = data.options ?? JSON.parse(question.options);
      const finalAnswer = data.correctAnswer ?? question.correctAnswer;
      if (finalOptions.length < 2) {
        throw new HttpError(400, "Resposta correta inválida");
      }
      if (!Number.isInteger(finalAnswer) || finalAnswer < 0 || finalAnswer >= finalOptions.length) {
        throw new HttpError(400, "Resposta correta inválida");
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
      throw new HttpError(404, "Questão não encontrada");
    }

    if (question.quiz.module.course.instructorId !== userId && userRole !== "ADMIN") {
      throw new HttpError(403, "Sem permissão para deletar esta questão");
    }

    await prisma.quizQuestion.delete({
      where: { id: questionId },
    });

    return { message: "Questão deletada com sucesso" };
  }

  async submitAttempt(
    quizId: string,
    userId: string,
    answers: { [questionId: string]: number },
    user: AuthUser
  ) {
    await assertCourseContentAccess(await getCourseIdByQuiz(quizId), user);

    if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
      throw new HttpError(400, "answers deve ser um objeto { questionId: índice }");
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!quiz) {
      throw new HttpError(404, "Quiz não encontrado");
    }

    const questionsWithParsedOptions = quiz.questions.map((q) => ({
      ...q,
      options: JSON.parse(q.options),
    }));

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
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            passingScore: true,
            module: {
              include: {
                course: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const notificationService = new NotificationService();
    if (passed) {
      await notificationService.createNotification(
        userId,
        "🎉 Quiz aprovado!",
        `Parabéns! Você passou no quiz "${attempt.quiz.title}" do curso "${attempt.quiz.module.course.title}" com ${score}% de acerto.`,
        "SUCCESS"
      ).catch(err => console.error("Erro ao criar notificação:", err));
    } else {
      await notificationService.createNotification(
        userId,
        "Quiz não aprovado",
        `Você obteve ${score}% no quiz "${attempt.quiz.title}" do curso "${attempt.quiz.module.course.title}". A nota mínima é ${attempt.quiz.passingScore}%. Tente novamente!`,
        "WARNING"
      ).catch(err => console.error("Erro ao criar notificação:", err));
    }

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


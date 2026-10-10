import type { Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import { NotificationService } from "./notificationService";
import { CertificateService } from "./certificateService";
import { HttpError } from "../utils/httpError";
import {
  AuthUser,
  assertCourseContentAccess,
  getCourseIdByQuiz,
  isOwnerOrAdmin,
} from "../utils/courseAccess";

/** Opções de questão gravadas como JSON (array de textos). */
const toOptions = (value: Prisma.JsonValue): string[] => (Array.isArray(value) ? value.map(String) : []);

export type QuizSettings = { maxAttempts?: number | null; shuffleQuestions?: boolean; shuffleOptions?: boolean };

/** Só repassa ao Prisma as configurações que vieram na requisição. */
const settingsData = (data: QuizSettings) => ({
  ...(data.maxAttempts !== undefined && { maxAttempts: data.maxAttempts }),
  ...(data.shuffleQuestions !== undefined && { shuffleQuestions: data.shuffleQuestions }),
  ...(data.shuffleOptions !== undefined && { shuffleOptions: data.shuffleOptions }),
});

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

    // O gabarito (resposta e explicação) só é enviado para o dono do curso ou administradores.
    const canSeeAnswers = isOwnerOrAdmin(quiz.module.course.instructorId, user);
    const { module: _module, ...quizData } = quiz;

    const [attemptsUsed, passedAttempt] = await Promise.all([
      prisma.quizAttempt.count({ where: { quizId: quiz.id, userId: user.userId } }),
      prisma.quizAttempt.findFirst({ where: { quizId: quiz.id, userId: user.userId, passed: true }, select: { id: true } }),
    ]);

    return {
      ...quizData,
      attemptsUsed,
      attemptsRemaining: quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - attemptsUsed),
      passed: !!passedAttempt,
      questions: quiz.questions.map(({ correctAnswer, explanation, ...q }) => ({
        ...q,
        options: toOptions(q.options),
        ...(canSeeAnswers && { correctAnswer, explanation }),
      })),
    };
  }

  async create(
    moduleId: string,
    data: { title: string; description?: string; passingScore?: number } & QuizSettings,
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
        ...settingsData(data),
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
        options: toOptions(q.options),
      })),
    };
  }

  async update(
    quizId: string,
    data: { title?: string; description?: string; passingScore?: number } & QuizSettings,
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
        ...settingsData(data),
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
        options: toOptions(q.options),
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
      explanation?: string | null;
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
        options: data.options,
        correctAnswer: data.correctAnswer,
        explanation: data.explanation || null,
        order: data.order ?? 0,
        quizId,
      },
    });

    return {
      ...question,
      options: toOptions(question.options),
    };
  }

  async updateQuestion(
    questionId: string,
    data: {
      question?: string;
      options?: string[];
      correctAnswer?: number;
      explanation?: string | null;
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
      const finalOptions: string[] = data.options ?? toOptions(question.options);
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
        ...(data.options && { options: data.options }),
        ...(data.correctAnswer !== undefined && { correctAnswer: data.correctAnswer }),
        ...(data.explanation !== undefined && { explanation: data.explanation || null }),
        ...(data.order !== undefined && { order: data.order }),
      },
    });

    return {
      ...updated,
      options: toOptions(updated.options),
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

    const previousAttempts = await prisma.quizAttempt.count({ where: { quizId, userId } });
    if (quiz.maxAttempts !== null && previousAttempts >= quiz.maxAttempts) {
      throw new HttpError(403, `Você já usou as ${quiz.maxAttempts} tentativa(s) permitidas neste quiz.`);
    }

    const questionResults = quiz.questions.map((question) => ({
      question,
      selected: answers[question.id],
      correct: answers[question.id] === question.correctAnswer,
    }));
    const correct = questionResults.filter((r) => r.correct).length;
    const totalQuestions = quiz.questions.length;

    const score = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const passed = score >= quiz.passingScore;

    const attempt = await prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
        answers,
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
        "SUCCESS",
        "QUIZ"
      ).catch(err => console.error("Erro ao criar notificação:", err));
    } else {
      await notificationService.createNotification(
        userId,
        "Quiz não aprovado",
        `Você obteve ${score}% no quiz "${attempt.quiz.title}" do curso "${attempt.quiz.module.course.title}". A nota mínima é ${attempt.quiz.passingScore}%. Tente novamente!`,
        "WARNING",
        "QUIZ"
      ).catch(err => console.error("Erro ao criar notificação:", err));
    }

    // A aprovação pode ser o último requisito para o certificado (cursos que exigem os quizzes).
    if (passed) {
      const pdfUrl = await new CertificateService().checkAndGenerateCertificate(userId, attempt.quiz.module.courseId);
      if (pdfUrl) {
        await notificationService
          .createNotification(
            userId,
            "🎉 Parabéns! Certificado gerado!",
            `Você completou o curso "${attempt.quiz.module.course.title}" e seu certificado está disponível para download.`,
            "SUCCESS",
            "CERTIFICATE"
          )
          .catch((err) => console.error("Erro ao criar notificação de certificado:", err));
      }
    }

    const attemptsUsed = previousAttempts + 1;
    const attemptsRemaining = quiz.maxAttempts === null ? null : Math.max(0, quiz.maxAttempts - attemptsUsed);
    // O gabarito só é revelado quando não serve mais para "colar" na próxima tentativa.
    const revealAnswers = passed || attemptsRemaining === 0;

    return {
      ...attempt,
      attemptsUsed,
      attemptsRemaining,
      answersRevealed: revealAnswers,
      results: questionResults.map(({ question, selected, correct }) => ({
        questionId: question.id,
        selected: selected ?? null,
        correct,
        ...(revealAnswers && { correctAnswer: question.correctAnswer, explanation: question.explanation }),
      })),
    };
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


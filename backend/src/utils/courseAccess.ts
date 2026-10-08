import { prisma } from "../config/database";
import { HttpError } from "./httpError";

export type AuthUser = { userId: string; role: string };

export function isOwnerOrAdmin(instructorId: string, user: AuthUser): boolean {
  return user.role === "ADMIN" || instructorId === user.userId;
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  return !!enrollment;
}

/**
 * Garante que o usuário pode acessar o conteúdo (aulas, quizzes, comentários) do curso:
 * dono do curso, administrador ou aluno matriculado.
 */
export async function assertCourseContentAccess(courseId: string, user: AuthUser): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { instructorId: true },
  });

  if (!course) {
    throw new HttpError(404, "Curso não encontrado");
  }

  if (isOwnerOrAdmin(course.instructorId, user)) return;

  if (!(await isEnrolled(user.userId, courseId))) {
    throw new HttpError(403, "Você precisa estar matriculado neste curso para acessar este conteúdo");
  }
}

export async function getCourseIdByModule(moduleId: string): Promise<string> {
  const module = await prisma.module.findUnique({ where: { id: moduleId }, select: { courseId: true } });
  if (!module) throw new HttpError(404, "Módulo não encontrado");
  return module.courseId;
}

export async function getCourseIdByLesson(lessonId: string): Promise<string> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });
  if (!lesson) throw new HttpError(404, "Aula não encontrada");
  return lesson.module.courseId;
}

export async function getCourseIdByQuiz(quizId: string): Promise<string> {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { module: { select: { courseId: true } } },
  });
  if (!quiz) throw new HttpError(404, "Quiz não encontrado");
  return quiz.module.courseId;
}

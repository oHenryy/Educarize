import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

type Stats = {
  totals: { students: number; enrollments: number; certificates: number };
  enrollmentsOverTime: { date: string; count: number }[];
  completionRates: { courseId: string; completionRate: number; totalStudents: number; completedStudents: number }[];
  quizPerformance: { totalAttempts: number; passedAttempts: number; averageScore: number; passRate: number }[];
  topStudents: {
    userId: string;
    lessonsCompleted: number;
    quizzesPassed: number;
    averageQuizScore: number;
    certificatesEarned: number;
    coursesEnrolled: number;
  }[];
  averageRatings: { overallAverage: number; byCourse: { courseId: string; averageRating: number; totalReviews: number }[] };
};

describe("dashboard do instrutor (agregações no banco)", () => {
  let stats: Stats;
  let courseA: string;
  let emptyCourse: string;
  let best: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    const instructor = await registerUser("INSTRUCTOR");
    best = await registerUser();
    other = await registerUser();

    // Curso A: 2 aulas e um quiz de 1 questão. Curso vazio: sem aulas.
    const a = await createCourse(instructor, { publish: true, title: "A" });
    courseA = a.course.id;
    const lesson2 = (await api.post("/lessons").set(auth(instructor)).send({ title: "Aula 2", moduleId: a.module.id })).body;
    const quiz = (await api.post("/quizzes").set(auth(instructor)).send({ moduleId: a.module.id, title: "Q" })).body;
    const question = (
      await api
        .post("/quizzes/questions")
        .set(auth(instructor))
        .send({ quizId: quiz.id, question: "?", options: ["x", "y"], correctAnswer: 0 })
    ).body;
    emptyCourse = (await createCourse(instructor, { publish: true, title: "Vazio" })).course.id;
    await api.delete(`/lessons/${(await api.get(`/courses/${emptyCourse}`).set(auth(instructor))).body.modules[0].lessons[0].id}`).set(auth(instructor));

    for (const s of [best, other]) await api.post("/enrollments").set(auth(s)).send({ courseId: courseA });

    // "best" conclui tudo e passa no quiz; "other" conclui 1 aula e reprova.
    await api.post("/progress/complete").set(auth(best)).send({ lessonId: a.lesson.id });
    await api.post("/progress/complete").set(auth(best)).send({ lessonId: lesson2.id });
    await api.post("/progress/complete").set(auth(other)).send({ lessonId: a.lesson.id });
    await api.post("/quizzes/attempt").set(auth(best)).send({ quizId: quiz.id, answers: { [question.id]: 0 } });
    await api.post("/quizzes/attempt").set(auth(other)).send({ quizId: quiz.id, answers: { [question.id]: 1 } });

    await api.post("/reviews").set(auth(best)).send({ courseId: courseA, rating: 5 });
    await api.post("/reviews").set(auth(other)).send({ courseId: courseA, rating: 3 });

    stats = (await api.get("/instructor/dashboard/stats").set(auth(instructor))).body;
  });

  it("totais", () => {
    expect(stats.totals).toMatchObject({ students: 2, enrollments: 2, certificates: 1 });
  });

  it("matrículas dos últimos 30 dias", () => {
    expect(stats.enrollmentsOverTime).toHaveLength(30);
    expect(stats.enrollmentsOverTime[stats.enrollmentsOverTime.length - 1].count).toBe(2);
    expect(stats.enrollmentsOverTime.reduce((sum, d) => sum + d.count, 0)).toBe(2);
  });

  it("taxa de conclusão por curso", () => {
    expect(stats.completionRates.find((c) => c.courseId === courseA)).toMatchObject({
      totalStudents: 2,
      completedStudents: 1,
      completionRate: 50,
    });
    expect(stats.completionRates.find((c) => c.courseId === emptyCourse)).toMatchObject({ completionRate: 0 });
  });

  it("desempenho nos quizzes", () => {
    expect(stats.quizPerformance[0]).toMatchObject({ totalAttempts: 2, passedAttempts: 1, averageScore: 50, passRate: 50 });
  });

  it("melhores alunos, ordenados por aulas concluídas", () => {
    expect(stats.topStudents.map((s) => s.userId)).toEqual([best.user.id, other.user.id]);
    expect(stats.topStudents[0]).toMatchObject({
      lessonsCompleted: 2,
      quizzesPassed: 1,
      averageQuizScore: 100,
      certificatesEarned: 1,
      coursesEnrolled: 1,
    });
    expect(stats.topStudents[1]).toMatchObject({ lessonsCompleted: 1, quizzesPassed: 0, averageQuizScore: 0 });
  });

  it("avaliações: média geral ponderada, ignorando cursos sem avaliação", () => {
    expect(stats.averageRatings.overallAverage).toBe(4);
    expect(stats.averageRatings.byCourse.find((c) => c.courseId === courseA)).toMatchObject({
      averageRating: 4,
      totalReviews: 2,
    });
    expect(stats.averageRatings.byCourse.find((c) => c.courseId === emptyCourse)).toMatchObject({ totalReviews: 0 });
  });
});

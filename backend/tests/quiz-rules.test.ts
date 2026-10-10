import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

async function setupQuiz(instructor: TestUser, quizSettings: Record<string, unknown>, courseSettings: Record<string, unknown> = {}) {
  const created = await createCourse(instructor, { publish: true });
  if (Object.keys(courseSettings).length) {
    await api.put(`/courses/${created.course.id}`).set(auth(instructor)).send(courseSettings);
  }
  const quiz = (
    await api.post("/quizzes").set(auth(instructor)).send({ moduleId: created.module.id, title: "Quiz Final", ...quizSettings })
  ).body;
  const question = (
    await api
      .post("/quizzes/questions")
      .set(auth(instructor))
      .send({ quizId: quiz.id, question: "2 + 2?", options: ["3", "4"], correctAnswer: 1, explanation: "Soma simples." })
  ).body;
  return { ...created, quiz, question };
}

describe("regras de quiz", () => {
  let instructor: TestUser;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
  });

  it("explicação e gabarito só aparecem para o dono antes do envio", async () => {
    const { course, module } = await setupQuiz(instructor, {});
    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });

    const asStudent = (await api.get(`/quizzes/module/${module.id}`).set(auth(student))).body;
    expect(asStudent.questions[0]).not.toHaveProperty("explanation");
    expect(asStudent.questions[0]).not.toHaveProperty("correctAnswer");
    expect(asStudent).toMatchObject({ attemptsUsed: 0, attemptsRemaining: null, passed: false });

    const asOwner = (await api.get(`/quizzes/module/${module.id}`).set(auth(instructor))).body;
    expect(asOwner.questions[0]).toMatchObject({ explanation: "Soma simples.", correctAnswer: 1 });
  });

  it("limita as tentativas e só revela o gabarito ao esgotá-las ou ser aprovado", async () => {
    const { course, module, quiz, question } = await setupQuiz(instructor, { maxAttempts: 2 });
    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    const wrong = { quizId: quiz.id, answers: { [question.id]: 0 } };

    const first = (await api.post("/quizzes/attempt").set(auth(student)).send(wrong)).body;
    expect(first).toMatchObject({ passed: false, attemptsUsed: 1, attemptsRemaining: 1, answersRevealed: false });
    expect(first.results[0]).toEqual({ questionId: question.id, selected: 0, correct: false });

    const second = (await api.post("/quizzes/attempt").set(auth(student)).send(wrong)).body;
    expect(second).toMatchObject({ attemptsRemaining: 0, answersRevealed: true });
    expect(second.results[0]).toMatchObject({ correct: false, correctAnswer: 1, explanation: "Soma simples." });

    const third = await api.post("/quizzes/attempt").set(auth(student)).send(wrong);
    expect(third.status).toBe(403);

    const state = (await api.get(`/quizzes/module/${module.id}`).set(auth(student))).body;
    expect(state).toMatchObject({ attemptsUsed: 2, attemptsRemaining: 0 });
  });

  it("aprovação revela o gabarito mesmo com tentativas restantes", async () => {
    const { course, quiz, question } = await setupQuiz(instructor, { maxAttempts: 3 });
    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    const res = (await api.post("/quizzes/attempt").set(auth(student)).send({ quizId: quiz.id, answers: { [question.id]: 1 } })).body;
    expect(res).toMatchObject({ passed: true, answersRevealed: true, attemptsRemaining: 2 });
    expect(res.results[0]).toMatchObject({ correct: true, correctAnswer: 1 });
  });

  it("valida as configurações do quiz", async () => {
    const { module } = await createCourse(instructor);
    const invalid = await api.post("/quizzes").set(auth(instructor)).send({ moduleId: module.id, title: "Q", maxAttempts: 0 });
    expect(invalid.status).toBe(400);
    const ok = await api
      .post("/quizzes")
      .set(auth(instructor))
      .send({ moduleId: module.id, title: "Q", maxAttempts: 3, shuffleQuestions: true, shuffleOptions: true });
    expect(ok.body).toMatchObject({ maxAttempts: 3, shuffleQuestions: true, shuffleOptions: true });
    const unlimited = await api.put(`/quizzes/${ok.body.id}`).set(auth(instructor)).send({ maxAttempts: null });
    expect(unlimited.body.maxAttempts).toBeNull();
  });
});

describe("certificado exige aprovação nos quizzes (opcional por curso)", () => {
  it("só emite depois da aprovação, e a aprovação emite automaticamente", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const { course, lesson, quiz, question } = await setupQuiz(instructor, {}, { requireQuizzesForCertificate: true });
    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });

    await api.post("/progress/complete").set(auth(student)).send({ lessonId: lesson.id });
    expect((await api.get("/certificates/my").set(auth(student))).body).toHaveLength(0);

    const progress = (await api.get(`/progress/course/${course.id}`).set(auth(student))).body;
    expect(progress.progressPercentage).toBe(100);
    expect(progress.pendingQuizzes).toEqual([expect.objectContaining({ id: quiz.id, title: "Quiz Final" })]);

    const manual = await api.post("/certificates/generate").set(auth(student)).send({ courseId: course.id });
    expect(manual.status).toBe(400);
    expect(manual.body.error).toContain("Quiz Final");

    await api.post("/quizzes/attempt").set(auth(student)).send({ quizId: quiz.id, answers: { [question.id]: 1 } });
    expect((await api.get("/certificates/my").set(auth(student))).body).toHaveLength(1);
    expect((await api.get(`/progress/course/${course.id}`).set(auth(student))).body.pendingQuizzes).toEqual([]);
  });

  it("cursos sem a opção continuam emitindo só com as aulas", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const { course, lesson } = await setupQuiz(instructor, {});
    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    await api.post("/progress/complete").set(auth(student)).send({ lessonId: lesson.id });
    expect((await api.get("/certificates/my").set(auth(student))).body).toHaveLength(1);
  });
});

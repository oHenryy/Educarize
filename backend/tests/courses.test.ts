import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

describe("cursos, aulas e visibilidade", () => {
  let instructor: TestUser;
  let otherInstructor: TestUser;
  let student: TestUser;
  let course: { id: string };
  let module: { id: string };

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    otherInstructor = await registerUser("INSTRUCTOR");
    student = await registerUser();
    ({ course, module } = await createCourse(instructor));
  });

  it("criar aula retorna a aula criada", async () => {
    const res = await api.post("/lessons").set(auth(instructor)).send({ title: "Aula 2", moduleId: module.id });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBe("Aula 2");
  });

  it("rejeita links de vídeo e de anexo que não sejam http(s)", async () => {
    const lesson = await api
      .post("/lessons")
      .set(auth(instructor))
      .send({ title: "X", moduleId: module.id, videoUrl: "javascript:alert(1)" });
    expect(lesson.status).toBe(400);

    const lessonId = (await api.get(`/courses/${course.id}`).set(auth(instructor))).body.modules[0].lessons[0].id;
    const attachment = await api
      .post(`/lessons/${lessonId}/attachments`)
      .set(auth(instructor))
      .send({ name: "x", fileUrl: "javascript:alert(1)", fileType: "LINK" });
    expect(attachment.status).toBe(400);
  });

  it("rascunhos não aparecem para alunos", async () => {
    const list = await api.get("/courses").set(auth(student));
    expect(list.body.courses.some((c: { id: string }) => c.id === course.id)).toBe(false);

    const viaStatus = await api.get("/courses?status=DRAFT").set(auth(student));
    expect(viaStatus.body.courses.some((c: { id: string }) => c.id === course.id)).toBe(false);

    const byId = await api.get(`/courses/${course.id}`).set(auth(student));
    expect(byId.status).toBe(404);

    const search = await api.get("/search/advanced?status=DRAFT");
    expect(search.body.courses.some((c: { id: string }) => c.id === course.id)).toBe(false);
  });

  it("instrutor vê os próprios rascunhos", async () => {
    const res = await api.get(`/courses?instructorId=${instructor.user.id}`).set(auth(instructor));
    expect(res.body.courses.some((c: { id: string }) => c.id === course.id)).toBe(true);
  });

  it("instrutor não pode suspender o próprio curso", async () => {
    const res = await api.put(`/courses/${course.id}`).set(auth(instructor)).send({ status: "SUSPENDED" });
    expect(res.status).toBe(403);
  });

  it("outro instrutor não altera tags nem o curso", async () => {
    const tag = await api.post(`/tags/courses/${course.id}`).set(auth(otherInstructor)).send({ tagName: "spam" });
    expect(tag.status).toBe(403);
    const update = await api.put(`/courses/${course.id}`).set(auth(otherInstructor)).send({ title: "Hack" });
    expect(update.status).toBe(403);
  });

  it("não matriculado vê apenas a ementa, sem link de vídeo", async () => {
    const { course: published } = await createCourse(instructor, { publish: true });
    const res = await api.get(`/courses/${published.id}`).set(auth(student));
    expect(res.status).toBe(200);
    expect(res.body.modules[0].lessons[0].videoUrl).toBeNull();

    await api.post("/enrollments").set(auth(student)).send({ courseId: published.id });
    const enrolled = await api.get(`/courses/${published.id}`).set(auth(student));
    expect(enrolled.body.modules[0].lessons[0].videoUrl).toBe("https://youtu.be/dQw4w9WgXcQ");
  });
});

describe("quizzes", () => {
  let instructor: TestUser;
  let student: TestUser;
  let moduleId: string;
  let questionId: string;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    student = await registerUser();
    const { course, module } = await createCourse(instructor, { publish: true });
    moduleId = module.id;
    const quiz = (
      await api.post("/quizzes").set(auth(instructor)).send({ moduleId, title: "Quiz", passingScore: 0 })
    ).body;
    expect(quiz.passingScore).toBe(0);
    questionId = (
      await api
        .post("/quizzes/questions")
        .set(auth(instructor))
        .send({ quizId: quiz.id, question: "?", options: ["a", "b"], correctAnswer: 1 })
    ).body.id;
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
  });

  it("rejeita nota mínima fora de 0–100", async () => {
    const quizId = (await api.get(`/quizzes/module/${moduleId}`).set(auth(instructor))).body.id;
    const update = await api.put(`/quizzes/${quizId}`).set(auth(instructor)).send({ passingScore: 150 });
    expect(update.status).toBe(400);
  });

  it("valida a resposta correta contra as opções existentes", async () => {
    const res = await api.put(`/quizzes/questions/${questionId}`).set(auth(instructor)).send({ correctAnswer: 5 });
    expect(res.status).toBe(400);
  });

  it("aluno não recebe o gabarito; o dono recebe", async () => {
    const asStudent = await api.get(`/quizzes/module/${moduleId}`).set(auth(student));
    expect(asStudent.status).toBe(200);
    expect(asStudent.body.questions.every((q: object) => !("correctAnswer" in q))).toBe(true);

    const asOwner = await api.get(`/quizzes/module/${moduleId}`).set(auth(instructor));
    expect(asOwner.body.questions.every((q: object) => "correctAnswer" in q)).toBe(true);
  });

  it("calcula a nota da tentativa", async () => {
    const quizId = (await api.get(`/quizzes/module/${moduleId}`).set(auth(student))).body.id;
    const res = await api
      .post("/quizzes/attempt")
      .set(auth(student))
      .send({ quizId, answers: { [questionId]: 1 } });
    expect(res.status).toBe(200);
    expect(res.body.score).toBe(100);
    expect(res.body.passed).toBe(true);
  });
});

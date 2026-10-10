import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

describe("acesso de quem não está matriculado", () => {
  let student: TestUser;
  let ids: { courseId: string; moduleId: string; lessonId: string };

  beforeAll(async () => {
    const instructor = await registerUser("INSTRUCTOR");
    student = await registerUser();
    const { course, module, lesson } = await createCourse(instructor, { publish: true });
    await api.post("/quizzes").set(auth(instructor)).send({ moduleId: module.id, title: "Quiz" });
    ids = { courseId: course.id, moduleId: module.id, lessonId: lesson.id };
  });

  type BlockedCase = [name: string, method: "get" | "post", path: () => string, body?: () => object];
  const cases: BlockedCase[] = [
    ["quiz", "get", () => `/quizzes/module/${ids.moduleId}`],
    ["aula", "get", () => `/lessons/${ids.lessonId}`],
    ["comentários", "get", () => `/comments/lesson/${ids.lessonId}`],
    ["concluir aula", "post", () => "/progress/complete", () => ({ lessonId: ids.lessonId })],
    ["certificado", "post", () => "/certificates/generate", () => ({ courseId: ids.courseId })],
    ["comentar", "post", () => "/comments", () => ({ lessonId: ids.lessonId, content: "oi" })],
    ["anotar", "post", () => "/notes", () => ({ lessonId: ids.lessonId, content: "nota" })],
  ];

  it.each(cases)("bloqueia %s (403)", async (_name, method, path, body) => {
    const req = method === "get" ? api.get(path()) : api.post(path()).send(body?.());
    const res = await req.set(auth(student));
    expect(res.status).toBe(403);
  });

  it("bloqueia avaliação", async () => {
    const res = await api.post("/reviews").set(auth(student)).send({ courseId: ids.courseId, rating: 5 });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.error).toMatch(/matriculado/);
  });
});

describe("fluxo do aluno matriculado", () => {
  let instructor: TestUser;
  let student: TestUser;
  let other: TestUser;
  let courseId: string;
  let moduleId: string;
  let lessonId: string;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    student = await registerUser();
    other = await registerUser();
    const created = await createCourse(instructor, { publish: true });
    courseId = created.course.id;
    moduleId = created.module.id;
    lessonId = created.lesson.id;
    await api.post("/enrollments").set(auth(student)).send({ courseId });
  });

  it("certificado exige 100% de conclusão", async () => {
    const res = await api.post("/certificates/generate").set(auth(student)).send({ courseId });
    expect(res.status).toBe(400);
  });

  it("gera o certificado automaticamente ao concluir o curso e reaproveita nas próximas chamadas", async () => {
    await api.post("/progress/complete").set(auth(student)).send({ lessonId });
    const certs = (await api.get("/certificates/my").set(auth(student))).body;
    expect(certs).toHaveLength(1);

    const again = await api.post("/certificates/generate").set(auth(student)).send({ courseId });
    expect(again.body.id).toBe(certs[0].id);
  });

  it("download do certificado exige ser o dono", async () => {
    const certId = (await api.get("/certificates/my").set(auth(student))).body[0].id;
    const own = await api.get(`/certificates/${certId}/download`).set(auth(student));
    expect(own.status).toBe(200);
    expect(own.headers["content-type"]).toContain("pdf");

    const stranger = await api.get(`/certificates/${certId}/download`).set(auth(other));
    expect(stranger.status).toBe(403);
  });

  it("gerar com curso incompleto não apaga o certificado existente", async () => {
    await api.post("/lessons").set(auth(instructor)).send({ title: "Aula nova", moduleId });
    const res = await api.post("/certificates/generate").set(auth(student)).send({ courseId });
    expect(res.status).toBe(400);
    expect((await api.get("/certificates/my").set(auth(student))).body).toHaveLength(1);
  });

  it("apagar um comentário remove as respostas dele", async () => {
    const parent = (
      await api.post("/comments").set(auth(student)).send({ lessonId, content: "pai" })
    ).body;
    await api.post("/comments").set(auth(instructor)).send({ lessonId, content: "filho", parentId: parent.id });
    await api.delete(`/comments/${parent.id}`).set(auth(student));
    const list = await api.get(`/comments/lesson/${lessonId}`).set(auth(student));
    expect(list.body).toHaveLength(0);
  });

  it("aluno matriculado pode avaliar; o instrutor não avalia o próprio curso", async () => {
    const ok = await api.post("/reviews").set(auth(student)).send({ courseId, rating: 5 });
    expect(ok.status).toBe(201);
    const own = await api.post("/reviews").set(auth(instructor)).send({ courseId, rating: 5 });
    expect(own.body.error).toMatch(/próprio curso/);
  });
});

describe("certificados sobrevivem à exclusão do curso", () => {
  it("mantém o certificado, com os dados do curso, e ele continua baixável", async () => {
    const instructor = await registerUser("INSTRUCTOR", "Prof. Carla");
    const student = await registerUser("STUDENT", "Diego");
    const { course, lesson } = await createCourse(instructor, { publish: true, title: "Curso Efêmero" });
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    await api.post("/progress/complete").set(auth(student)).send({ lessonId: lesson.id });

    expect((await api.delete(`/courses/${course.id}`).set(auth(instructor))).status).toBe(200);

    const certs = (await api.get("/certificates/my").set(auth(student))).body;
    expect(certs).toHaveLength(1);
    expect(certs[0]).toMatchObject({
      courseId: null,
      courseTitle: "Curso Efêmero",
      instructorName: "Prof. Carla",
      studentName: "Diego",
    });

    const download = await api.get(`/certificates/${certs[0].id}/download`).set(auth(student));
    expect(download.status).toBe(200);
    expect(download.headers["content-disposition"]).toContain("Curso");
  });
});

describe("certificados — rotas de arquivo", () => {
  it("não expõe arquivos do servidor por path traversal", async () => {
    const student = await registerUser();
    const anonymous = await api.get("/certificates/..%2Fprisma%2Fschema.prisma");
    expect(anonymous.status).toBe(401);
    const logged = await api.get("/certificates/..%2Fprisma%2Fschema.prisma").set(auth(student));
    expect(logged.status).toBe(404);
    expect(logged.text).not.toContain("generator");
    const legacy = await api.get("/certificates/file/..%2Fpackage.json").set(auth(student));
    expect(legacy.status).toBe(404);
  });
});

describe("verificação pública de certificado", () => {
  it("qualquer pessoa confere o certificado pelo código, sem login e sem dados pessoais extras", async () => {
    const instructor = await registerUser("INSTRUCTOR", "Prof. Helena");
    const student = await registerUser("STUDENT", "Ícaro Souza");
    const { course, lesson } = await createCourse(instructor, { publish: true, title: "Curso Verificável" });
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    await api.post("/progress/complete").set(auth(student)).send({ lessonId: lesson.id });

    const [cert] = (await api.get("/certificates/my").set(auth(student))).body;
    expect(cert.verificationCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const res = await api.get(`/certificates/verify/${cert.verificationCode}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      valid: true,
      verificationCode: cert.verificationCode,
      studentName: "Ícaro Souza",
      courseTitle: "Curso Verificável",
      instructorName: "Prof. Helena",
    });
    expect(JSON.stringify(res.body)).not.toMatch(/@|userId|email/);

    // Aceita sem hífens e em minúsculas (digitado a partir do papel).
    const typed = await api.get(`/certificates/verify/${cert.verificationCode.replace(/-/g, "").toLowerCase()}`);
    expect(typed.status).toBe(200);

    expect((await api.get("/certificates/verify/AAAA-BBBB-CCCC")).status).toBe(404);
  });

  it("regerar o PDF mantém o mesmo código", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const student = await registerUser();
    const { course, lesson } = await createCourse(instructor, { publish: true });
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    await api.post("/progress/complete").set(auth(student)).send({ lessonId: lesson.id });
    const first = (await api.get("/certificates/my").set(auth(student))).body[0];
    const again = await api.post("/certificates/generate").set(auth(student)).send({ courseId: course.id });
    expect(again.body.verificationCode).toBe(first.verificationCode);
  });
});

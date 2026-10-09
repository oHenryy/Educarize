import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

describe("validação de entrada e tratamento de erros", () => {
  let instructor: TestUser;
  let student: TestUser;
  let lessonId: string;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    student = await registerUser();
    const { course, lesson } = await createCourse(instructor, { publish: true });
    lessonId = lesson.id;
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
  });

  it("rejeita campos obrigatórios ausentes com mensagem e detalhes", async () => {
    const res = await api.post("/courses").set(auth(instructor)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Título é obrigatório");
    expect(res.body.details[0].field).toBe("title");
  });

  it("limita o tamanho dos textos", async () => {
    const res = await api
      .post("/comments")
      .set(auth(student))
      .send({ lessonId, content: "x".repeat(5001) });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no máximo 5000/);
  });

  it("valida tipos e faixas numéricas", async () => {
    const rating = await api.post("/reviews").set(auth(student)).send({ courseId: "x", rating: 7 });
    expect(rating.status).toBe(400);
    const hours = await api.post("/courses").set(auth(instructor)).send({ title: "T", durationHours: "dez" });
    expect(hours.status).toBe(400);
  });

  it("descarta campos não declarados (sem atribuição em massa)", async () => {
    const res = await api
      .post("/courses")
      .set(auth(instructor))
      .send({ title: "Curso", instructorId: student.user.id, status: "PUBLISHED" });
    expect(res.status).toBe(201);
    expect(res.body.instructor.id).toBe(instructor.user.id);
    expect(res.body.status).toBe("DRAFT");
  });

  it("limita a paginação", async () => {
    const res = await api.get("/notifications?limit=500").set(auth(student));
    expect(res.status).toBe(400);
  });

  it("responde 400 em JSON malformado e 404 em rota inexistente", async () => {
    const malformed = await api
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": ');
    expect(malformed.status).toBe(400);
    expect(malformed.body.error).toMatch(/JSON inválido/);

    const missing = await api.get("/rota-que-nao-existe");
    expect(missing.status).toBe(404);
    expect(missing.body.error).toBe("Rota não encontrada");
  });

  it("recusa corpo acima de 1 MB", async () => {
    const res = await api
      .post("/notes")
      .set(auth(student))
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ lessonId, content: "x".repeat(1_100_000) }));
    expect(res.status).toBe(413);
  });

  it("não expõe detalhes internos em erros inesperados", async () => {
    // Registro inexistente no update: o Prisma lança P2025, traduzido para 404 sem a mensagem interna.
    const res = await api.put("/notes/id-inexistente").set(auth(student)).send({ content: "x" });
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/prisma|invocation/i);
  });

  it("e-mail é normalizado no cadastro e o login aceita qualquer capitalização", async () => {
    const email = `Maiusculo${Date.now()}@Test.com`;
    const reg = await api.post("/auth/register").send({ name: "M", email, password: "senha123" });
    expect(reg.body.user.email).toBe(email.toLowerCase());
    const login = await api.post("/auth/login").send({ email: email.toUpperCase().toLowerCase(), password: "senha123" });
    expect(login.status).toBe(200);
  });
});

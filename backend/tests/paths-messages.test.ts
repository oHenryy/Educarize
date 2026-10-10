import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

describe("trilhas de aprendizado", () => {
  let instructor: TestUser;
  let pathId: string;
  let courseA: string;
  let courseB: string;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    pathId = (await api.post("/learning-paths").set(auth(instructor)).send({ title: "Trilha" })).body.id;
    courseA = (await createCourse(instructor, { publish: true, title: "A" })).course.id;
    courseB = (await createCourse(instructor, { title: "B" })).course.id;
  });

  it("rascunho aparece para o autor e não para anônimos", async () => {
    const own = await api.get(`/learning-paths?instructorId=${instructor.user.id}`).set(auth(instructor));
    expect(own.body.some((p: { id: string }) => p.id === pathId)).toBe(true);

    const anonymousList = await api.get("/learning-paths?status=DRAFT");
    expect(anonymousList.body.some((p: { id: string }) => p.id === pathId)).toBe(false);
    expect((await api.get(`/learning-paths/${pathId}`)).status).toBe(404);
  });

  it("só aceita cursos publicados e sem duplicidade", async () => {
    const draft = await api.post(`/learning-paths/${pathId}/courses`).set(auth(instructor)).send({ courseId: courseB });
    expect(draft.status).toBe(400);

    await api.put(`/courses/${courseB}`).set(auth(instructor)).send({ status: "PUBLISHED" });
    await api.post(`/learning-paths/${pathId}/courses`).set(auth(instructor)).send({ courseId: courseA });
    await api.post(`/learning-paths/${pathId}/courses`).set(auth(instructor)).send({ courseId: courseB });
    const duplicate = await api.post(`/learning-paths/${pathId}/courses`).set(auth(instructor)).send({ courseId: courseB });
    expect(duplicate.status).toBe(409);
  });

  it("reordena de forma atômica e remove por parâmetro de rota", async () => {
    const reorder = await api
      .put(`/learning-paths/${pathId}/courses/reorder`)
      .set(auth(instructor))
      .send({ courseIds: [courseB, courseA] });
    expect(reorder.status).toBe(200);
    expect(reorder.body.courses[0].courseId).toBe(courseB);

    const invalid = await api
      .put(`/learning-paths/${pathId}/courses/reorder`)
      .set(auth(instructor))
      .send({ courseIds: [courseA] });
    expect(invalid.status).toBe(400);

    const removed = await api.delete(`/learning-paths/${pathId}/courses/${courseB}`).set(auth(instructor));
    expect(removed.status).toBe(204);
  });
});

describe("mensagens", () => {
  it("a página 1 traz as mensagens mais recentes, em ordem cronológica", async () => {
    const sender = await registerUser("INSTRUCTOR");
    const receiver = await registerUser();
    for (let i = 0; i < 55; i++) {
      await api.post("/messages").set(auth(sender)).send({ receiverId: receiver.user.id, content: `m${i}` });
    }
    const res = await api.get(`/messages/conversations/${sender.user.id}`).set(auth(receiver));
    const contents = res.body.messages.map((m: { content: string }) => m.content);
    expect(contents).toHaveLength(50);
    expect(contents[0]).toBe("m5");
    expect(contents[49]).toBe("m54");
  });

  it("não permite enviar mensagem para si mesmo", async () => {
    const u = await registerUser();
    const res = await api.post("/messages").set(auth(u)).send({ receiverId: u.user.id, content: "oi" });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("dashboard do instrutor", () => {
  it("curso sem aulas não aparece como 100% concluído", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const empty = (await api.post("/courses").set(auth(instructor)).send({ title: "Vazio" })).body;
    const res = await api.get("/instructor/dashboard/stats").set(auth(instructor));
    expect(res.status).toBe(200);
    const rate = res.body.completionRates.find((c: { courseId: string }) => c.courseId === empty.id);
    expect(rate.completionRate).toBe(0);
  });
});

describe("progresso da trilha", () => {
  it("é calculado na leitura e a conclusão é registrada quando o aluno conclui a última aula", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const student = await registerUser();
    const { course, lesson } = await createCourse(instructor, { publish: true });
    const path = (await api.post("/learning-paths").set(auth(instructor)).send({ title: "T", status: "PUBLISHED" })).body;
    await api.post(`/learning-paths/${path.id}/courses`).set(auth(instructor)).send({ courseId: course.id });
    await api.post(`/learning-paths/${path.id}/enroll`).set(auth(student));

    const before = await api.get(`/learning-paths/${path.id}/progress`).set(auth(student));
    expect(before.body).toMatchObject({ progress: 0, totalLessons: 1, completedLessons: 0, totalCourses: 1 });

    await api.post("/progress/complete").set(auth(student)).send({ lessonId: lesson.id });

    const mine = (await api.get("/learning-paths/my").set(auth(student))).body;
    expect(mine[0]).toMatchObject({ progress: 100 });
    expect(mine[0].completedAt).toBeTruthy();

    const notifications = (await api.get("/notifications").set(auth(student))).body.notifications;
    expect(notifications.some((n: { title: string }) => n.title === "Parabéns! Trilha concluída!")).toBe(true);

    // Uma aula nova reduz o progresso exibido imediatamente (calculado na leitura).
    const moduleId = (await api.get(`/courses/${course.id}`).set(auth(instructor))).body.modules[0].id;
    await api.post("/lessons").set(auth(instructor)).send({ title: "Nova", moduleId });
    const after = await api.get(`/learning-paths/${path.id}/progress`).set(auth(student));
    expect(after.body).toMatchObject({ progress: 50, totalLessons: 2, completedLessons: 1 });
  });
});

describe("lista de conversas", () => {
  it("traz a última mensagem de cada conversa, mais recente primeiro, com as não lidas", async () => {
    const me = await registerUser();
    const ana = await registerUser("INSTRUCTOR", "Ana");
    const caio = await registerUser("INSTRUCTOR", "Caio");

    await api.post("/messages").set(auth(ana)).send({ receiverId: me.user.id, content: "ana 1" });
    await api.post("/messages").set(auth(ana)).send({ receiverId: me.user.id, content: "ana 2" });
    await api.post("/messages").set(auth(caio)).send({ receiverId: me.user.id, content: "caio 1" });
    await api.post("/messages").set(auth(me)).send({ receiverId: ana.user.id, content: "resposta para ana" });

    const conversations = (await api.get("/messages/conversations").set(auth(me))).body;
    expect(conversations.map((c: { user: { name: string } }) => c.user.name)).toEqual(["Ana", "Caio"]);
    expect(conversations[0]).toMatchObject({ unreadCount: 2, lastMessage: { content: "resposta para ana" } });
    expect(conversations[1]).toMatchObject({ unreadCount: 1, lastMessage: { content: "caio 1" } });
  });
});

describe("busca de usuários", () => {
  it("filtra por nome e papel, sem incluir o próprio usuário", async () => {
    const me = await registerUser();
    const unique = `Zelda${Date.now()}`;
    await registerUser("INSTRUCTOR", unique);
    await registerUser("STUDENT", unique);

    const all = (await api.get(`/auth/users?search=${unique}`).set(auth(me))).body;
    expect(all).toHaveLength(2);
    const instructors = (await api.get(`/auth/users?search=${unique}&roles=INSTRUCTOR`).set(auth(me))).body;
    expect(instructors).toHaveLength(1);
    expect(instructors[0].role).toBe("INSTRUCTOR");
    const self = (await api.get(`/auth/users?search=${encodeURIComponent(me.user.name)}&limit=100`).set(auth(me))).body;
    expect(self.some((u: { id: string }) => u.id === me.user.id)).toBe(false);
  });
});

describe("listagem de cursos", () => {
  it("é paginada", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    for (let i = 0; i < 3; i++) await api.post("/courses").set(auth(instructor)).send({ title: `P${i}` });
    const page1 = (await api.get(`/courses?instructorId=${instructor.user.id}&limit=2`).set(auth(instructor))).body;
    expect(page1.courses).toHaveLength(2);
    expect(page1.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    const page2 = (await api.get(`/courses?instructorId=${instructor.user.id}&limit=2&page=2`).set(auth(instructor))).body;
    expect(page2.courses).toHaveLength(1);
    expect(page2.courses[0].modules).toBeUndefined();
  });
});

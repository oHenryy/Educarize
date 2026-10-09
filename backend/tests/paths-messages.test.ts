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

import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

describe("reordenação de módulos e aulas", () => {
  let instructor: TestUser;
  let other: TestUser;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    other = await registerUser("INSTRUCTOR");
  });

  it("reordena os módulos do curso", async () => {
    const { course, module: first } = await createCourse(instructor);
    const second = (await api.post("/modules").set(auth(instructor)).send({ title: "Segundo", courseId: course.id })).body;
    const third = (await api.post("/modules").set(auth(instructor)).send({ title: "Terceiro", courseId: course.id })).body;

    const res = await api
      .put("/modules/reorder")
      .set(auth(instructor))
      .send({ courseId: course.id, moduleIds: [third.id, first.id, second.id] });
    expect(res.status).toBe(200);
    expect(res.body.map((m: { id: string }) => m.id)).toEqual([third.id, first.id, second.id]);
    expect(res.body.map((m: { order: number }) => m.order)).toEqual([0, 1, 2]);

    const listed = (await api.get(`/modules/course/${course.id}`).set(auth(instructor))).body;
    expect(listed.map((m: { id: string }) => m.id)).toEqual([third.id, first.id, second.id]);
  });

  it("exige exatamente os módulos atuais e permissão de dono", async () => {
    const { course, module: first } = await createCourse(instructor);
    const second = (await api.post("/modules").set(auth(instructor)).send({ title: "Segundo", courseId: course.id })).body;
    const foreign = (await createCourse(other)).module;

    const cases = [[first.id], [first.id, first.id], [first.id, second.id, foreign.id], [first.id, foreign.id]];
    for (const moduleIds of cases) {
      const res = await api.put("/modules/reorder").set(auth(instructor)).send({ courseId: course.id, moduleIds });
      expect(res.status).toBe(400);
    }

    const forbidden = await api
      .put("/modules/reorder")
      .set(auth(other))
      .send({ courseId: course.id, moduleIds: [second.id, first.id] });
    expect(forbidden.status).toBe(403);

    const invalid = await api.put("/modules/reorder").set(auth(instructor)).send({ courseId: course.id });
    expect(invalid.status).toBe(400);
  });

  it("reordena as aulas do módulo", async () => {
    const { module, lesson: first } = await createCourse(instructor);
    const second = (await api.post("/lessons").set(auth(instructor)).send({ title: "Aula 2", moduleId: module.id })).body;

    const res = await api
      .put("/lessons/reorder")
      .set(auth(instructor))
      .send({ moduleId: module.id, lessonIds: [second.id, first.id] });
    expect(res.status).toBe(200);
    expect(res.body.map((l: { id: string }) => l.id)).toEqual([second.id, first.id]);

    const otherModule = (await createCourse(other)).module;
    const moved = await api
      .put("/lessons/reorder")
      .set(auth(other))
      .send({ moduleId: module.id, lessonIds: [first.id, second.id] });
    expect(moved.status).toBe(403);

    const mixed = await api
      .put("/lessons/reorder")
      .set(auth(instructor))
      .send({ moduleId: otherModule.id, lessonIds: [first.id] });
    expect(mixed.status).toBe(403);

    const missing = await api.put("/lessons/reorder").set(auth(instructor)).send({ moduleId: module.id, lessonIds: [first.id] });
    expect(missing.status).toBe(400);
  });
});

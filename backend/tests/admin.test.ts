import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, createAdmin, createCourse, registerUser, TestUser } from "./helpers";

describe("administração de usuários", () => {
  let admin: TestUser;

  beforeAll(async () => {
    admin = await createAdmin();
  });

  it("admin não exclui nem rebaixa a si mesmo", async () => {
    expect((await api.delete(`/admin/users/${admin.user.id}`).set(auth(admin))).status).toBe(400);
    const demote = await api.put(`/admin/users/${admin.user.id}/role`).set(auth(admin)).send({ role: "STUDENT" });
    expect(demote.status).toBe(400);
  });

  it("autor de conteúdo precisa transferir antes de ser excluído ou rebaixado", async () => {
    const author = await registerUser("INSTRUCTOR");
    await createCourse(author);
    await api.post("/learning-paths").set(auth(author)).send({ title: "Trilha" });

    const del = await api.delete(`/admin/users/${author.user.id}`).set(auth(admin));
    expect(del.status).toBe(400);
    expect(del.body.error).toMatch(/Transfira/);
    const demote = await api.put(`/admin/users/${author.user.id}/role`).set(auth(admin)).send({ role: "STUDENT" });
    expect(demote.status).toBe(400);

    const student = await registerUser();
    const toStudent = await api
      .post(`/admin/users/${author.user.id}/transfer-content`)
      .set(auth(admin))
      .send({ targetUserId: student.user.id });
    expect(toStudent.status).toBe(400);

    const receiver = await registerUser("INSTRUCTOR");
    const transfer = await api
      .post(`/admin/users/${author.user.id}/transfer-content`)
      .set(auth(admin))
      .send({ targetUserId: receiver.user.id });
    expect(transfer.body).toEqual({ coursesTransferred: 1, learningPathsTransferred: 1 });

    const received = await api.get(`/courses?instructorId=${receiver.user.id}`).set(auth(receiver));
    expect(received.body.courses).toHaveLength(1);

    expect((await api.delete(`/admin/users/${author.user.id}`).set(auth(admin))).status).toBe(200);
  });

  it("mudança de papel e exclusão valem imediatamente para tokens já emitidos", async () => {
    const instructor = await registerUser("INSTRUCTOR");
    const demote = await api
      .put(`/admin/users/${instructor.user.id}/role`)
      .set(auth(admin))
      .send({ role: "STUDENT" });
    expect(demote.body.role).toBe("STUDENT");
    expect((await api.post("/courses").set(auth(instructor)).send({ title: "X" })).status).toBe(403);

    expect((await api.delete(`/admin/users/${instructor.user.id}`).set(auth(admin))).status).toBe(200);
    expect((await api.get("/auth/me").set(auth(instructor))).status).toBe(401);
  });

  it("registra a alteração de papel no log de atividades", async () => {
    const res = await api.get("/activity-logs?action=USER_UPDATED").set(auth(admin));
    expect(res.body.logs.length).toBeGreaterThan(0);
  });

  it("rotas de admin são bloqueadas para outros papéis", async () => {
    const student = await registerUser();
    expect((await api.get("/admin/users").set(auth(student))).status).toBe(403);
  });
});

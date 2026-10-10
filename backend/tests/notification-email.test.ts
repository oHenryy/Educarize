import { beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/config/database";
import { sentTestEmails } from "../src/utils/mailer";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";

const emailsTo = (user: TestUser) => sentTestEmails.filter((m) => m.to === user.user.email);
const verify = (user: TestUser) =>
  prisma.user.update({ where: { id: user.user.id }, data: { emailVerifiedAt: new Date() } });

/** O e-mail sai em segundo plano: espera um pouco para garantir que nada (mais) foi enviado. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

describe("notificações por e-mail", () => {
  let instructor: TestUser;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR", "Professora");
    await verify(instructor);
  });

  it("lista as preferências com os padrões e permite alterá-las", async () => {
    const student = await registerUser();
    const initial = await api.get("/notifications/preferences").set(auth(student));
    expect(initial.status).toBe(200);
    const asMap = (prefs: { category: string; email: boolean }[]) =>
      Object.fromEntries(prefs.map((p) => [p.category, p.email]));
    expect(asMap(initial.body)).toEqual({
      MESSAGE: true,
      COMMENT: true,
      CERTIFICATE: true,
      REVIEW: true,
      QUIZ: false,
      ENROLLMENT: false,
      PROGRESS: false,
    });

    const updated = await api
      .put("/notifications/preferences")
      .set(auth(student))
      .send({ email: { MESSAGE: false, PROGRESS: true } });
    expect(updated.status).toBe(200);
    expect(asMap(updated.body)).toMatchObject({ MESSAGE: false, PROGRESS: true, COMMENT: true });

    const reread = await api.get("/notifications/preferences").set(auth(student));
    expect(asMap(reread.body)).toMatchObject({ MESSAGE: false, PROGRESS: true });

    for (const body of [{}, { email: { UNKNOWN: true } }, { email: { MESSAGE: "sim" } }, { email: { GENERAL: true } }]) {
      const res = await api.put("/notifications/preferences").set(auth(student)).send(body);
      expect(res.status).toBe(400);
    }
  });

  it("envia e-mail conforme a categoria e a preferência, só para e-mails confirmados", async () => {
    const { course } = await createCourse(instructor, { publish: true, title: "Curso de E-mail" });
    const student = await registerUser("STUDENT", "Aluna");
    await verify(student);
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });

    // Avaliação: categoria REVIEW, ligada por padrão para a instrutora.
    await api.post("/reviews").set(auth(student)).send({ courseId: course.id, rating: 5 });
    await vi.waitFor(() => expect(emailsTo(instructor).some((m) => m.subject.startsWith("Nova avaliação"))).toBe(true));
    const reviewMail = emailsTo(instructor).find((m) => m.subject.startsWith("Nova avaliação"))!;
    expect(reviewMail.subject).toBe("Nova avaliação no seu curso — Educarize");
    expect(reviewMail.text).toContain("Curso de E-mail");
    expect(reviewMail.text).toContain("/profile");

    // Matrícula: desligada por padrão (nem a aluna nem a instrutora recebem).
    await settle();
    expect(emailsTo(student).some((m) => m.subject.startsWith("Matrícula"))).toBe(false);
    expect(emailsTo(instructor).some((m) => m.subject.startsWith("Novo aluno"))).toBe(false);

    // Mensagem direta: ligada por padrão; desligar a preferência interrompe o envio.
    await api.post("/messages").set(auth(instructor)).send({ receiverId: student.user.id, content: "Oi!" });
    await vi.waitFor(() => expect(emailsTo(student).filter((m) => m.subject.startsWith("Nova mensagem"))).toHaveLength(1));
    await api.put("/notifications/preferences").set(auth(student)).send({ email: { MESSAGE: false } });
    await api.post("/messages").set(auth(instructor)).send({ receiverId: student.user.id, content: "Oi de novo!" });
    await settle();
    expect(emailsTo(student).filter((m) => m.subject.startsWith("Nova mensagem"))).toHaveLength(1);

    // A notificação no sistema continua sendo criada, com a categoria.
    const notifications = (await api.get("/notifications").set(auth(student))).body.notifications;
    expect(notifications.filter((n: { category: string }) => n.category === "MESSAGE")).toHaveLength(2);
  });

  it("não envia para e-mail não confirmado", async () => {
    const unverified = await registerUser();
    await api.post("/messages").set(auth(instructor)).send({ receiverId: unverified.user.id, content: "Olá" });
    await settle();
    expect(emailsTo(unverified).some((m) => m.subject.startsWith("Nova mensagem"))).toBe(false);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { api, auth, cookieHeader, cookiesFrom, createAdmin, login, registerUser } from "./helpers";
import { sentTestEmails } from "../src/utils/mailer";

const lastEmailTo = (email: string) => [...sentTestEmails].reverse().find((m) => m.to === email);
const tokenFromEmail = (text: string) => decodeURIComponent(/token=([^\s]+)/.exec(text)![1]);

describe("sessão por cookies httpOnly", () => {
  it("login define cookies httpOnly e não devolve o token no corpo", async () => {
    const u = await registerUser();
    const res = await api.post("/auth/login").send({ email: u.user.email, password: "senha123" });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/token/i);

    const setCookie = (res.headers["set-cookie"] as unknown as string[]).join("\n");
    expect(setCookie).toMatch(/access_token=[^;]+;.*HttpOnly/);
    expect(setCookie).toMatch(/refresh_token=[^;]+;.*Path=\/auth;.*HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
  });

  it("bloqueia alterações sem o cabeçalho anti-CSRF", async () => {
    const u = await registerUser("INSTRUCTOR");
    const blocked = await api.raw.post("/courses").set(auth(u)).send({ title: "X" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("CSRF");

    // Leituras não precisam do cabeçalho.
    expect((await api.raw.get("/auth/me").set(auth(u))).status).toBe(200);
  });

  it("access token expirado responde TOKEN_EXPIRED", async () => {
    const u = await registerUser();
    const expired = jwt.sign({ userId: u.user.id, role: "STUDENT", exp: Math.floor(Date.now() / 1000) - 10 }, "test-secret");
    const res = await api.get("/auth/me").set("Cookie", `access_token=${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("TOKEN_EXPIRED");
  });

  it("refresh rotaciona o token e detecta reuso", async () => {
    const u = await registerUser();
    const original = cookiesFrom(await api.post("/auth/login").send({ email: u.user.email, password: "senha123" }));

    const first = await api.post("/auth/refresh").set("Cookie", `refresh_token=${original.refresh_token}`);
    expect(first.status).toBe(200);
    expect(first.body.user.id).toBe(u.user.id);
    const rotated = cookiesFrom(first);
    expect(rotated.refresh_token).toBeTruthy();
    expect(rotated.refresh_token).not.toBe(original.refresh_token);
    expect((await api.get("/auth/me").set("Cookie", cookieHeader(rotated))).status).toBe(200);

    // Reapresentar o token antigo (já rotacionado) indica roubo: todas as sessões caem.
    const reuse = await api.post("/auth/refresh").set("Cookie", `refresh_token=${original.refresh_token}`);
    expect(reuse.status).toBe(401);
    const afterReuse = await api.post("/auth/refresh").set("Cookie", `refresh_token=${rotated.refresh_token}`);
    expect(afterReuse.status).toBe(401);
  });

  it("logout revoga o refresh token e limpa os cookies", async () => {
    const u = await registerUser();
    const cookies = cookiesFrom(await api.post("/auth/login").send({ email: u.user.email, password: "senha123" }));
    const res = await api.post("/auth/logout").set("Cookie", cookieHeader(cookies));
    expect(res.status).toBe(204);
    expect((res.headers["set-cookie"] as unknown as string[]).join("\n")).toMatch(/access_token=;/);
    const refresh = await api.post("/auth/refresh").set("Cookie", `refresh_token=${cookies.refresh_token}`);
    expect(refresh.status).toBe(401);
  });

  it("trocar a senha encerra as outras sessões e mantém a atual", async () => {
    const u = await registerUser();
    const otherDevice = cookiesFrom(await api.post("/auth/login").send({ email: u.user.email, password: "senha123" }));

    const change = await api
      .post("/auth/change-password")
      .set(auth(u))
      .send({ currentPassword: "senha123", newPassword: "novaSenha1" });
    expect(change.status).toBe(200);

    const current = cookiesFrom(change);
    const currentRefresh = await api.post("/auth/refresh").set("Cookie", `refresh_token=${current.refresh_token}`);
    expect(currentRefresh.status).toBe(200);
    const otherRefresh = await api.post("/auth/refresh").set("Cookie", `refresh_token=${otherDevice.refresh_token}`);
    expect(otherRefresh.status).toBe(401);
  });

  it("redefinição de senha pelo admin encerra as sessões do usuário", async () => {
    const admin = await createAdmin();
    const u = await registerUser();
    const session = cookiesFrom(await api.post("/auth/login").send({ email: u.user.email, password: "senha123" }));
    await api.put(`/admin/users/${u.user.id}/reset-password`).set(auth(admin)).send({ newPassword: "outra123" });
    const refresh = await api.post("/auth/refresh").set("Cookie", `refresh_token=${session.refresh_token}`);
    expect(refresh.status).toBe(401);
  });
});

describe("recuperação de senha", () => {
  it("envia link, redefine a senha uma única vez e derruba as sessões antigas", async () => {
    const u = await registerUser();
    const res = await api.post("/auth/forgot-password").send({ email: u.user.email });
    expect(res.status).toBe(200);

    const email = lastEmailTo(u.user.email);
    expect(email?.subject).toMatch(/Redefinição de senha/);
    const token = tokenFromEmail(email!.text);

    const reset = await api.post("/auth/reset-password").send({ token, newPassword: "senhaNova9" });
    expect(reset.status).toBe(200);

    expect((await api.post("/auth/login").send({ email: u.user.email, password: "senha123" })).status).toBe(401);
    await login(u.user.email, "senhaNova9");

    const reuse = await api.post("/auth/reset-password").send({ token, newPassword: "outraSenha" });
    expect(reuse.status).toBe(400);

    // A sessão aberta antes da redefinição não pode mais ser renovada.
    const oldRefreshToken = /refresh_token=([^;]+)/.exec(u.cookie)![1];
    const refresh = await api.post("/auth/refresh").set("Cookie", `refresh_token=${oldRefreshToken}`);
    expect(refresh.status).toBe(401);
  });

  it("não revela se o e-mail existe", async () => {
    const before = sentTestEmails.length;
    const res = await api.post("/auth/forgot-password").send({ email: "nao-existe@test.com" });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Se o e-mail estiver cadastrado/);
    expect(sentTestEmails.length).toBe(before);
  });

  it("rejeita token inválido", async () => {
    const res = await api.post("/auth/reset-password").send({ token: "invalido", newPassword: "senha123" });
    expect(res.status).toBe(400);
  });
});

describe("verificação de e-mail", () => {
  afterEach(() => {
    delete process.env.REQUIRE_EMAIL_VERIFICATION;
  });

  it("cadastro envia o link e a confirmação marca o e-mail como verificado", async () => {
    const u = await registerUser();
    expect(u.user.emailVerifiedAt).toBeNull();

    const token = tokenFromEmail(lastEmailTo(u.user.email)!.text);
    expect((await api.post("/auth/verify-email").send({ token })).status).toBe(200);

    const me = await api.get("/auth/me").set(auth(u));
    expect(me.body.user.emailVerifiedAt).toBeTruthy();

    expect((await api.post("/auth/resend-verification").set(auth(u))).status).toBe(400);
  });

  it("reenviar gera um novo link e invalida o anterior", async () => {
    const u = await registerUser();
    const first = tokenFromEmail(lastEmailTo(u.user.email)!.text);
    expect((await api.post("/auth/resend-verification").set(auth(u))).status).toBe(200);
    const second = tokenFromEmail(lastEmailTo(u.user.email)!.text);
    expect(second).not.toBe(first);
    expect((await api.post("/auth/verify-email").send({ token: first })).status).toBe(400);
    expect((await api.post("/auth/verify-email").send({ token: second })).status).toBe(200);
  });

  it("com REQUIRE_EMAIL_VERIFICATION=true, o login exige e-mail confirmado", async () => {
    const u = await registerUser();
    process.env.REQUIRE_EMAIL_VERIFICATION = "true";
    const blocked = await api.post("/auth/login").send({ email: u.user.email, password: "senha123" });
    expect(blocked.status).toBe(403);

    const token = tokenFromEmail(lastEmailTo(u.user.email)!.text);
    await api.post("/auth/verify-email").send({ token });
    expect((await api.post("/auth/login").send({ email: u.user.email, password: "senha123" })).status).toBe(200);
  });
});

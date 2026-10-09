import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { api, auth, createAdmin, registerUser } from "./helpers";
import { rateLimit } from "../src/middleware/authMiddleware";

describe("autenticação", () => {
  it("não permite se auto-registrar como ADMIN", async () => {
    const res = await api
      .post("/auth/register")
      .send({ name: "x", email: `fake${Date.now()}@test.com`, password: "senha123", role: "ADMIN" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("STUDENT");
  });

  it("permite se registrar como instrutor", async () => {
    const u = await registerUser("INSTRUCTOR");
    expect(u.user.role).toBe("INSTRUCTOR");
  });

  it("rejeita e-mail duplicado", async () => {
    const u = await registerUser();
    const res = await api.post("/auth/register").send({ name: "x", email: u.user.email, password: "senha123" });
    expect(res.status).toBe(409);
  });

  it("rejeita credenciais inválidas", async () => {
    const u = await registerUser();
    const res = await api.post("/auth/login").send({ email: u.user.email, password: "errada" });
    expect(res.status).toBe(401);
  });

  it("rejeita sessão ausente ou inválida", async () => {
    const missing = await api.get("/auth/me");
    expect(missing.status).toBe(401);
    expect(missing.body.code).toBe("UNAUTHENTICATED");

    const invalid = await api.get("/auth/me").set("Cookie", "access_token=invalido");
    expect(invalid.status).toBe(401);
    expect(invalid.body.code).toBe("INVALID_TOKEN");
  });

  it("não aceita mais token no cabeçalho Authorization", async () => {
    const res = await api.get("/auth/me").set("Authorization", "Bearer qualquer");
    expect(res.status).toBe(401);
  });

  it("lista de usuários não expõe e-mail para não-admin, mas expõe para admin", async () => {
    const student = await registerUser();
    const admin = await createAdmin();
    const asStudent = await api.get("/auth/users").set(auth(student));
    expect(asStudent.body.every((u: object) => !("email" in u))).toBe(true);
    const asAdmin = await api.get("/auth/users").set(auth(admin));
    expect(asAdmin.body.every((u: object) => "email" in u)).toBe(true);
  });
});

describe("rate limit", () => {
  it("bloqueia com 429 após exceder o limite", async () => {
    const mini = express();
    mini.post("/login", rateLimit(3, 60_000), (_req, res) => res.json({ ok: true }));
    const statuses = [];
    for (let i = 0; i < 5; i++) statuses.push((await request(mini).post("/login")).status);
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });
});

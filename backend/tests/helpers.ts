import request, { Response } from "supertest";
import bcrypt from "bcryptjs";
import app from "../src/app";
import { prisma } from "../src/config/database";

const raw = request(app);
export const CSRF = { "X-Requested-With": "XMLHttpRequest" };

/** Cliente HTTP dos testes: métodos que alteram dados já enviam o cabeçalho anti-CSRF, como o frontend. */
export const api = {
  get: (path: string) => raw.get(path),
  post: (path: string) => raw.post(path).set(CSRF),
  put: (path: string) => raw.put(path).set(CSRF),
  delete: (path: string) => raw.delete(path).set(CSRF),
  /** Sem o cabeçalho anti-CSRF, para testar o bloqueio. */
  raw,
};

let counter = 0;
const unique = () => `${Date.now()}${counter++}`;

export type TestUser = {
  /** Cabeçalho Cookie com access_token e refresh_token da sessão. */
  cookie: string;
  user: { id: string; name: string; email: string; role: string; emailVerifiedAt: string | null };
};

/** Extrai "nome=valor" de cada Set-Cookie da resposta. */
export function cookiesFrom(res: Response): Record<string, string> {
  const header = res.headers["set-cookie"] as unknown as string[] | undefined;
  const result: Record<string, string> = {};
  for (const c of header ?? []) {
    const [pair] = c.split(";");
    const index = pair.indexOf("=");
    result[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return result;
}

export const cookieHeader = (cookies: Record<string, string>) =>
  Object.entries(cookies)
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

const toTestUser = (res: Response): TestUser => ({ cookie: cookieHeader(cookiesFrom(res)), user: res.body.user });

export async function registerUser(role: "STUDENT" | "INSTRUCTOR" = "STUDENT", name = "Usuário"): Promise<TestUser> {
  const res = await api
    .post("/auth/register")
    .send({ name, email: `${role.toLowerCase()}${unique()}@test.com`, password: "senha123", role });
  if (res.status !== 201) throw new Error(`Falha ao registrar: ${res.status} ${JSON.stringify(res.body)}`);
  return toTestUser(res);
}

export async function login(email: string, password: string): Promise<TestUser> {
  const res = await api.post("/auth/login").send({ email, password });
  if (res.status !== 200) throw new Error(`Falha no login: ${res.status} ${JSON.stringify(res.body)}`);
  return toTestUser(res);
}

/** Admins não podem se auto-registrar: são criados direto no banco, como faz o script create-admin. */
export async function createAdmin(): Promise<TestUser> {
  const email = `admin${unique()}@test.com`;
  await prisma.user.create({
    data: { name: "Admin", email, passwordHash: await bcrypt.hash("admin123", 10), role: "ADMIN" },
  });
  return login(email, "admin123");
}

export const auth = (u: TestUser) => ({ Cookie: u.cookie });

/** Cria um curso com um módulo e uma aula. */
export async function createCourse(owner: TestUser, opts: { publish?: boolean; title?: string } = {}) {
  const course = (await api.post("/courses").set(auth(owner)).send({ title: opts.title ?? "Curso de Teste" })).body;
  const module = (await api.post("/modules").set(auth(owner)).send({ title: "Módulo 1", courseId: course.id })).body;
  const lesson = (
    await api
      .post("/lessons")
      .set(auth(owner))
      .send({ title: "Aula 1", moduleId: module.id, videoUrl: "https://youtu.be/dQw4w9WgXcQ" })
  ).body;
  if (opts.publish) {
    await api.put(`/courses/${course.id}`).set(auth(owner)).send({ status: "PUBLISHED" });
  }
  return { course, module, lesson };
}

import { beforeAll, describe, expect, it } from "vitest";
import { api, auth, registerUser, TestUser } from "./helpers";
import { likePattern, toPrefixTsQuery } from "../src/utils/textSearch";

/** Palavra rara para isolar os cursos deste arquivo dos criados pelos outros testes. */
const TAG = "Zimbrafone";

async function publishedCourse(owner: TestUser, title: string, description?: string) {
  const course = (await api.post("/courses").set(auth(owner)).send({ title, description })).body;
  await api.put(`/courses/${course.id}`).set(auth(owner)).send({ status: "PUBLISHED" });
  return course as { id: string; title: string };
}

const titles = (res: { body: { courses: { title: string }[] } }) => res.body.courses.map((c) => c.title);

describe("busca textual", () => {
  let instructor: TestUser;
  let viewer: TestUser;
  let byTitle: { id: string };
  let byDescription: { id: string };

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    viewer = await registerUser();
    byDescription = await publishedCourse(instructor, `Lógica ${TAG}`, "Base para programação estruturada e algoritmos.");
    byTitle = await publishedCourse(instructor, `Programação ${TAG} Avançada`, "Tópicos avançados.");
    await publishedCourse(instructor, `Culinária ${TAG}`, "Receitas do dia a dia.");
    const draft = (await api.post("/courses").set(auth(instructor)).send({ title: `Programação ${TAG} Rascunho` })).body;
    expect(draft.status).toBe("DRAFT");
  });

  it("monta a consulta por prefixos e escapa curingas do LIKE", () => {
    expect(toPrefixTsQuery("Programação  web!")).toBe("programação:* & web:*");
    expect(toPrefixTsQuery("  %%  ")).toBeNull();
    expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
  });

  it("ignora acentos e maiúsculas, aceita prefixos e ordena pela relevância", async () => {
    for (const search of [`programacao ${TAG}`, `PROGRAMAÇÃO ${TAG.toLowerCase()}`, `progr ${TAG}`]) {
      const res = await api.get("/courses").set(auth(viewer)).query({ search });
      expect(res.status).toBe(200);
      // O título vem antes da descrição; o rascunho não aparece.
      expect(titles(res)).toEqual([`Programação ${TAG} Avançada`, `Lógica ${TAG}`]);
      expect(res.body.pagination.total).toBe(2);
    }
  });

  it("encontra palavras flexionadas (radical em português)", async () => {
    const res = await api.get("/courses").set(auth(viewer)).query({ search: `algoritmo ${TAG}` });
    expect(titles(res)).toEqual([`Lógica ${TAG}`]);
  });

  it("pagina sobre os resultados ordenados", async () => {
    const first = await api.get("/courses").set(auth(viewer)).query({ search: `programacao ${TAG}`, limit: 1, page: 1 });
    const second = await api.get("/courses").set(auth(viewer)).query({ search: `programacao ${TAG}`, limit: 1, page: 2 });
    expect(first.body.courses[0].id).toBe(byTitle.id);
    expect(second.body.courses[0].id).toBe(byDescription.id);
    expect(second.body.pagination).toMatchObject({ total: 2, totalPages: 2 });
  });

  it("busca avançada e sugestões usam a mesma busca", async () => {
    const advanced = await api.get("/search/advanced").query({ query: `logica ${TAG}` });
    expect(titles(advanced)).toEqual([`Lógica ${TAG}`]);

    const suggestions = await api.get("/search/suggestions").query({ query: `culinaria ${TAG}` });
    expect(suggestions.body.courses.map((c: { title: string }) => c.title)).toEqual([`Culinária ${TAG}`]);
  });

  it("caracteres especiais não quebram nem casam com tudo", async () => {
    for (const search of ["%", "_", "'; DROP TABLE \"Course\"; --", "&|!:*()"]) {
      const res = await api.get("/courses").set(auth(viewer)).query({ search });
      expect(res.status).toBe(200);
      expect(titles(res).some((t) => t.includes(TAG))).toBe(false);
    }
  });

  it("parâmetro repetido na URL usa o primeiro valor", async () => {
    const res = await api.get(`/courses?search=logica+${TAG}&search=outro`).set(auth(viewer));
    expect(res.status).toBe(200);
    expect(titles(res)).toEqual([`Lógica ${TAG}`]);
    const suggestions = await api.get(`/search/suggestions?query=logica+${TAG}&query=x`);
    expect(suggestions.status).toBe(200);
  });

  it("aulas e anotações também ignoram acentos", async () => {
    const course = await publishedCourse(instructor, `Curso de Aulas ${TAG}`);
    const module = (await api.post("/modules").set(auth(instructor)).send({ title: "M1", courseId: course.id })).body;
    const lesson = (
      await api.post("/lessons").set(auth(instructor)).send({ title: `Funções e Módulos ${TAG}`, moduleId: module.id })
    ).body;

    const lessons = await api.get("/search/lessons").query({ query: `funcoes ${TAG}` });
    expect(lessons.body.map((l: { id: string }) => l.id)).toEqual([lesson.id]);

    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    await api.post("/notes").set(auth(student)).send({ lessonId: lesson.id, content: "Revisar ÁRVORES binárias" });
    const notes = await api.get("/search/notes").set(auth(student)).query({ query: "arvores" });
    expect(notes.body).toHaveLength(1);
    expect(notes.body[0].content).toBe("Revisar ÁRVORES binárias");
  });
});

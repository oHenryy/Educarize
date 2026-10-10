import fs from "fs";
import path from "path";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/database";
import { api, auth, createCourse, registerUser, TestUser } from "./helpers";
import { runFileCleanup } from "../src/jobs/fileCleanup";

const PNG = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082",
  "hex"
);
const PDF = Buffer.from("%PDF-1.4\n%âãÏÓ\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n");

const upload = (user: TestUser, purpose: string, content: Buffer, name: string) =>
  api.post("/files").set(auth(user)).field("purpose", purpose).attach("file", content, name);

/** Lê o corpo binário da resposta. */
const binary = (req: ReturnType<typeof api.get>) =>
  req.buffer(true).parse((res, done) => {
    const chunks: Buffer[] = [];
    res.on("data", (chunk: Buffer) => chunks.push(chunk));
    res.on("end", () => done(null, Buffer.concat(chunks)));
  });

/** Pasta do storage local definida para os testes (vitest.config.ts). */
const UPLOAD_DIR = process.env.UPLOAD_DIR!;

const storedPath = async (fileId: string) => {
  const file = await prisma.storedFile.findUnique({ where: { id: fileId } });
  return file ? path.join(UPLOAD_DIR, file.key) : null;
};

describe("upload de arquivos", () => {
  let instructor: TestUser;
  let otherInstructor: TestUser;

  beforeAll(async () => {
    instructor = await registerUser("INSTRUCTOR");
    otherInstructor = await registerUser("INSTRUCTOR");
  });

  it("capa: envia imagem e qualquer pessoa pode vê-la", async () => {
    const res = await upload(instructor, "cover", PNG, "capa.png");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "capa.png", mimeType: "image/png", size: PNG.length, fileType: "IMAGE" });
    expect(res.body.url).toMatch(new RegExp(`/files/${res.body.id}$`));

    const file = await binary(api.get(`/files/${res.body.id}`));
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toBe("image/png");
    expect(file.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(file.headers["cache-control"]).toContain("immutable");
    expect(Buffer.compare(file.body, PNG)).toBe(0);
  });

  it("valida quem envia, o tipo, o conteúdo e o tamanho", async () => {
    const student = await registerUser();
    expect((await upload(student, "cover", PNG, "capa.png")).status).toBe(403);
    expect((await api.post("/files").field("purpose", "cover").attach("file", PNG, "capa.png")).status).toBe(401);

    const cases: [string, Buffer, string, number][] = [
      ["cover", PDF, "doc.pdf", 400], // capa só aceita imagens
      ["attachment", Buffer.from("<script>alert(1)</script>"), "pagina.html", 400],
      ["attachment", Buffer.from("<svg onload=alert(1)>"), "imagem.svg", 400],
      ["attachment", Buffer.from("não sou um pdf"), "falso.pdf", 400], // assinatura não confere
      ["cover", Buffer.from("texto"), "falsa.png", 400],
      ["attachment", Buffer.alloc(0), "vazio.txt", 400],
      ["cover", Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]), "grande.png", 413],
      ["outro", PNG, "capa.png", 400],
    ];
    for (const [purpose, content, name, status] of cases) {
      const res = await upload(instructor, purpose, content, name);
      expect(res.status, name).toBe(status);
      expect(res.body.error, name).toBeTruthy();
    }

    const noFile = await api.post("/files").set(auth(instructor)).field("purpose", "attachment");
    expect(noFile.status).toBe(400);
  });

  it("anexo: só quem tem acesso ao curso baixa, e o arquivo some com o anexo", async () => {
    const { course, lesson } = await createCourse(instructor, { publish: true });
    const uploaded = (await upload(instructor, "attachment", PDF, "Exercícios.pdf")).body;

    // Ela não pode usar um arquivo enviado por outro instrutor.
    const foreign = (await upload(otherInstructor, "attachment", PDF, "x.pdf")).body;
    const stolen = await api
      .post(`/lessons/${lesson.id}/attachments`)
      .set(auth(instructor))
      .send({ name: "Lista", fileId: foreign.id });
    expect(stolen.status).toBe(403);

    const attachment = await api
      .post(`/lessons/${lesson.id}/attachments`)
      .set(auth(instructor))
      .send({ name: "Lista de exercícios", fileId: uploaded.id });
    expect(attachment.status).toBe(201);
    expect(attachment.body).toMatchObject({ fileType: "PDF", fileSize: PDF.length, fileId: uploaded.id });
    // O supertest usa uma porta nova a cada requisição: compara só o caminho do link.
    expect(attachment.body.fileUrl).toMatch(new RegExp(`/files/${uploaded.id}$`));

    expect((await api.get(`/files/${uploaded.id}`)).status).toBe(401);
    const outsider = await registerUser();
    expect((await api.get(`/files/${uploaded.id}`).set(auth(outsider))).status).toBe(403);

    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    const download = await binary(api.get(`/files/${uploaded.id}`).set(auth(student)));
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toBe("application/pdf");
    expect(download.headers["content-disposition"]).toContain("attachment;");
    expect(download.headers["content-disposition"]).toContain(`filename*=UTF-8''${encodeURIComponent("Exercícios.pdf")}`);
    expect(download.headers["cache-control"]).toContain("no-store");
    expect(Buffer.compare(download.body, PDF)).toBe(0);

    const filePath = (await storedPath(uploaded.id))!;
    expect(fs.existsSync(filePath)).toBe(true);
    await api.delete(`/lessons/attachments/${attachment.body.id}`).set(auth(instructor));
    expect(fs.existsSync(filePath)).toBe(false);
    expect((await api.get(`/files/${uploaded.id}`).set(auth(instructor))).status).toBe(404);
  });

  it("anexo por link continua funcionando e exige link e tipo", async () => {
    const { lesson } = await createCourse(instructor);
    const link = await api
      .post(`/lessons/${lesson.id}/attachments`)
      .set(auth(instructor))
      .send({ name: "Docs", fileUrl: "https://exemplo.com/docs", fileType: "LINK" });
    expect(link.status).toBe(201);
    expect(link.body.fileId).toBeNull();

    const missing = await api.post(`/lessons/${lesson.id}/attachments`).set(auth(instructor)).send({ name: "Sem arquivo" });
    expect(missing.status).toBe(400);
  });

  it("trocar a capa ou excluir o curso remove os arquivos enviados", async () => {
    const { course, lesson } = await createCourse(instructor);
    const first = (await upload(instructor, "cover", PNG, "a.png")).body;
    const second = (await upload(instructor, "cover", PNG, "b.png")).body;
    const material = (await upload(instructor, "attachment", PDF, "m.pdf")).body;
    await api.post(`/lessons/${lesson.id}/attachments`).set(auth(instructor)).send({ name: "M", fileId: material.id });

    await api.put(`/courses/${course.id}`).set(auth(instructor)).send({ coverImageUrl: first.url });
    const firstPath = (await storedPath(first.id))!;
    await api.put(`/courses/${course.id}`).set(auth(instructor)).send({ coverImageUrl: second.url });
    expect(fs.existsSync(firstPath)).toBe(false);
    expect((await api.get(`/files/${second.id}`)).status).toBe(200);

    const secondPath = (await storedPath(second.id))!;
    const materialPath = (await storedPath(material.id))!;
    await api.delete(`/courses/${course.id}`).set(auth(instructor));
    expect(fs.existsSync(secondPath)).toBe(false);
    expect(fs.existsSync(materialPath)).toBe(false);
    expect(await prisma.storedFile.count({ where: { id: { in: [first.id, second.id, material.id] } } })).toBe(0);
  });

  it("capa usada em outro curso não é apagada ao ser trocada", async () => {
    const a = (await createCourse(instructor)).course;
    const b = (await createCourse(instructor)).course;
    const shared = (await upload(instructor, "cover", PNG, "compartilhada.png")).body;
    await api.put(`/courses/${a.id}`).set(auth(instructor)).send({ coverImageUrl: shared.url });
    await api.put(`/courses/${b.id}`).set(auth(instructor)).send({ coverImageUrl: shared.url });

    await api.put(`/courses/${a.id}`).set(auth(instructor)).send({ coverImageUrl: "https://exemplo.com/outra.png" });
    expect((await api.get(`/files/${shared.id}`)).status).toBe(200);

    await api.put(`/courses/${b.id}`).set(auth(instructor)).send({ coverImageUrl: "" });
    expect((await api.get(`/files/${shared.id}`)).status).toBe(404);
  });

  it("rotina de limpeza remove só arquivos antigos e sem uso", async () => {
    const { course, lesson } = await createCourse(instructor);
    const make = async (purpose: string, content: Buffer, name: string) => (await upload(instructor, purpose, content, name)).body.id as string;

    const orphanAttachment = await make("attachment", PDF, "esquecido.pdf");
    const orphanCover = await make("cover", PNG, "nao-salva.png");
    const usedAttachment = await make("attachment", PDF, "usado.pdf");
    const courseCover = await make("cover", PNG, "curso.png");
    const pathCover = await make("cover", PNG, "trilha.png");
    const recentOrphan = await make("attachment", PDF, "recente.pdf");

    await api.post(`/lessons/${lesson.id}/attachments`).set(auth(instructor)).send({ name: "Usado", fileId: usedAttachment });
    const url = (id: string) => `http://localhost/files/${id}`;
    await api.put(`/courses/${course.id}`).set(auth(instructor)).send({ coverImageUrl: url(courseCover) });
    await api.post("/learning-paths").set(auth(instructor)).send({ title: "Trilha com capa", coverImageUrl: url(pathCover) });

    // Todos "antigos", menos o recente (ainda dentro da carência).
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await prisma.storedFile.updateMany({ where: { id: { not: recentOrphan }, ownerId: instructor.user.id }, data: { createdAt: old } });

    const orphanPaths = [(await storedPath(orphanAttachment))!, (await storedPath(orphanCover))!];
    const result = await runFileCleanup(24);
    expect(result.removed).toBeGreaterThanOrEqual(2);

    const remaining = new Set((await prisma.storedFile.findMany({ select: { id: true } })).map((f) => f.id));
    expect(remaining.has(orphanAttachment)).toBe(false);
    expect(remaining.has(orphanCover)).toBe(false);
    expect(orphanPaths.some((p) => fs.existsSync(p))).toBe(false);
    for (const kept of [usedAttachment, courseCover, pathCover, recentOrphan]) {
      expect(remaining.has(kept)).toBe(true);
      expect(fs.existsSync((await storedPath(kept))!)).toBe(true);
    }

    // Rodar de novo não encontra mais nada para remover entre esses arquivos.
    await runFileCleanup(24);
    expect(await prisma.storedFile.count({ where: { id: { in: [usedAttachment, courseCover, pathCover, recentOrphan] } } })).toBe(4);
  });

  it("certificados ficam no storage", async () => {
    const { course } = await createCourse(instructor, { publish: true });
    const student = await registerUser();
    await api.post("/enrollments").set(auth(student)).send({ courseId: course.id });
    const lessonId = (await prisma.lesson.findFirst({ where: { module: { courseId: course.id } } }))!.id;
    await api.post("/progress/complete").set(auth(student)).send({ lessonId });

    const cert = await prisma.certificate.findFirst({ where: { userId: student.user.id, courseId: course.id } });
    expect(cert).not.toBeNull();
    expect(fs.existsSync(path.join(UPLOAD_DIR, "certificates", path.basename(cert!.pdfUrl)))).toBe(true);
    const download = await binary(api.get(`/certificates/${cert!.id}/download`).set(auth(student)));
    expect(download.status).toBe(200);
    expect(download.body.subarray(0, 4).toString()).toBe("%PDF");
  });
});

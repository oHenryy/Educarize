import { prisma } from "../config/database";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { logActivity } from "../utils/activityLogger";
import { HttpError } from "../utils/httpError";
import { config } from "../config/env";
import crypto from "crypto";
import QRCode from "qrcode";
import { Readable } from "stream";
import { storage } from "../storage/fileStorage";

/** Sem caracteres ambíguos (0/O, 1/I/L): o código pode ser digitado a partir do papel. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateVerificationCode(): string {
  return Array.from({ length: 12 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
}

/** Exibição em blocos: ABCD-EFGH-JKMN. */
export const formatVerificationCode = (code: string) => code.match(/.{1,4}/g)!.join("-");

/** Aceita o código com ou sem hífens/espaços e em qualquer caixa. */
const normalizeVerificationCode = (input: string) => input.replace(/[\s-]/g, "").toUpperCase();

export const verificationUrl = (code: string) =>
  `${config.frontendUrl}/certificates/verify/${formatVerificationCode(code)}`;

/** Pasta onde os PDFs eram gravados antes do storage (ainda lida para certificados antigos). */
const LEGACY_CERTS_DIR = path.resolve(process.cwd(), config.certificatesDir);

/** Chave do PDF no storage a partir da URL salva (só o nome do arquivo é usado). */
const certificateKey = (pdfUrl: string) => `certificates/${path.basename(pdfUrl)}`;
const legacyCertificatePath = (pdfUrl: string) => path.join(LEGACY_CERTS_DIR, path.basename(pdfUrl));

/** Conteúdo do PDF do certificado, ou null se o arquivo não existir mais. */
export async function openCertificatePdf(pdfUrl: string): Promise<Readable | null> {
  const stored = await storage.get(certificateKey(pdfUrl));
  if (stored) return stored;
  const legacy = legacyCertificatePath(pdfUrl);
  return fs.existsSync(legacy) ? fs.createReadStream(legacy) : null;
}

async function certificatePdfExists(pdfUrl: string): Promise<boolean> {
  return (await storage.exists(certificateKey(pdfUrl))) || fs.existsSync(legacyCertificatePath(pdfUrl));
}

/** Gera o PDF inteiro em memória (um certificado tem poucos KB). */
function renderPdf(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/**
 * Quizzes ainda não aprovados pelo aluno em um curso que exige aprovação para o certificado.
 * Retorna lista vazia se o curso não exige quizzes.
 */
export async function pendingQuizzesForCertificate(userId: string, courseId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { requireQuizzesForCertificate: true },
  });
  if (!course?.requireQuizzesForCertificate) return [];

  return prisma.quiz.findMany({
    where: {
      module: { courseId },
      questions: { some: {} },
      attempts: { none: { userId, passed: true } },
    },
    select: { id: true, title: true, moduleId: true },
    orderBy: { module: { order: "asc" } },
  });
}

export class CertificateService {
  async generateCertificate(userId: string, courseId: string) {
    const [user, course, enrollment] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      }),
      prisma.course.findUnique({
        where: { id: courseId },
        include: {
          instructor: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        select: { id: true },
      }),
    ]);

    if (!user || !course) {
      throw new HttpError(404, "Usuário ou curso não encontrado");
    }

    if (!enrollment) {
      throw new HttpError(403, "Você precisa estar matriculado no curso para obter o certificado");
    }

    const [totalLessons, completedLessons] = await Promise.all([
      prisma.lesson.count({ where: { module: { courseId } } }),
      prisma.userProgress.count({
        where: { userId, completed: true, lesson: { module: { courseId } } },
      }),
    ]);

    if (totalLessons === 0 || completedLessons < totalLessons) {
      throw new HttpError(400, "Curso não foi completado (100% de progresso necessário)");
    }

    const pendingQuizzes = await pendingQuizzesForCertificate(userId, courseId);
    if (pendingQuizzes.length > 0) {
      throw new HttpError(
        400,
        `Para obter o certificado, seja aprovado nos quizzes: ${pendingQuizzes.map((q) => q.title).join(", ")}.`
      );
    }

    const existing = await prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    // Certificado já emitido e com arquivo íntegro: não regera.
    if (existing && (await certificatePdfExists(existing.pdfUrl))) {
      return existing;
    }

    // Ao regerar o PDF de um certificado existente, o código (e o QR já impresso) continua o mesmo.
    const verificationCode = existing?.verificationCode ?? generateVerificationCode();
    const qrCode = await QRCode.toBuffer(verificationUrl(verificationCode), { margin: 1, width: 240 });

    const fileName = `certificate_${userId}_${courseId}_${Date.now()}.pdf`;
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const rendered = renderPdf(doc);

    const pageWidth = 742;
    const pageHeight = 495;
    doc
      .fillColor("#6366f1")
      .fontSize(40)
      .font("Helvetica-Bold")
      .text("CERTIFICADO", 50, 60, { width: pageWidth, align: "center" });

    doc
      .strokeColor("#6366f1")
      .lineWidth(3)
      .moveTo(100, 120)
      .lineTo(742, 120)
      .stroke();

    doc
      .fillColor("#111827")
      .fontSize(16)
      .font("Helvetica")
      .text("Certificamos que", 50, 160, { width: pageWidth, align: "center" });

    const userName = user.name.toUpperCase();
    doc
      .fillColor("#6366f1")
      .fontSize(28)
      .font("Helvetica-Bold")
      .text(userName, 50, 200, { width: pageWidth, align: "center" });

    doc
      .fillColor("#111827")
      .fontSize(14)
      .font("Helvetica")
      .text("completou com sucesso o curso", 50, 250, { width: pageWidth, align: "center" });

    doc
      .fillColor("#6366f1")
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(course.title, 50, 280, { width: pageWidth, align: "center" });

    doc
      .fillColor("#6b7280")
      .fontSize(11)
      .font("Helvetica")
      .text(`Carga horária: ${course.durationHours} horas`, 50, 330, { width: pageWidth, align: "center" });

    const issueDate = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    doc.text(`Emitido em ${issueDate}`, 50, 355, { width: pageWidth, align: "center" });

    const instructorName = course.instructor?.name || "Instrutor";
    doc
      .fillColor("#111827")
      .fontSize(10)
      .font("Helvetica");

    doc.text("_________________________", 120, 420);
    doc.text(instructorName, 120, 440, { width: 200, align: "center" });
    doc.text("Instrutor", 120, 460, { width: 200, align: "center" });

    doc.text("_________________________", 522, 420);
    doc.text("Educarize LMS", 522, 440, { width: 200, align: "center" });
    doc.text("Plataforma", 522, 460, { width: 200, align: "center" });

    // QR code entre as assinaturas, apontando para a página pública de verificação.
    doc.image(qrCode, 386, 405, { width: 70 });

    doc
      .fillColor("#6b7280")
      .fontSize(8)
      .text(
        `Código de verificação: ${formatVerificationCode(verificationCode)}  •  Confira em ${verificationUrl(verificationCode)}`,
        50,
        505,
        { width: pageWidth, align: "center" }
      );

    doc.end();
    await storage.put(certificateKey(fileName), await rendered, "application/pdf");

    const pdfUrl = `/certificates/file/${fileName}`;

    // Cópia dos dados impressos no PDF: o certificado continua válido mesmo se o curso mudar ou for excluído.
    const snapshot = {
      courseTitle: course.title,
      courseDurationHours: course.durationHours,
      instructorName,
      studentName: user.name,
    };

    // Se existia registro mas o arquivo sumiu, apenas atualiza o registro com o novo PDF.
    const certificate = existing
      ? await prisma.certificate.update({ where: { id: existing.id }, data: { pdfUrl, ...snapshot } })
      : await prisma.certificate.create({
          data: {
            userId,
            courseId,
            pdfUrl,
            verificationCode,
            ...snapshot,
          },
        });

    await logActivity({
      action: "CERTIFICATE_GENERATED",
      description: `Certificado gerado para o curso "${course.title}"`,
      resourceId: certificate.id,
      resourceType: "CERTIFICATE",
      userId,
    });

    return certificate;
  }

  async getMyCertificates(userId: string) {
    const certificates = await prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            coverImageUrl: true,
            durationHours: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });
    return certificates.map((c) => ({ ...c, verificationCode: formatVerificationCode(c.verificationCode) }));
  }

  /** Consulta pública: confirma a autenticidade sem expor dados pessoais além do nome impresso no certificado. */
  async verify(code: string) {
    const certificate = await prisma.certificate.findUnique({
      where: { verificationCode: normalizeVerificationCode(code) },
      select: {
        verificationCode: true,
        studentName: true,
        courseTitle: true,
        courseDurationHours: true,
        instructorName: true,
        issuedAt: true,
      },
    });

    if (!certificate) {
      throw new HttpError(404, "Certificado não encontrado. Confira o código digitado.");
    }

    return { ...certificate, verificationCode: formatVerificationCode(certificate.verificationCode), valid: true };
  }

  async getCertificateById(certificateId: string, userId: string) {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            durationHours: true,
            instructor: {
              select: {
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new HttpError(404, "Certificado não encontrado");
    }

    if (certificate.userId !== userId) {
      throw new HttpError(403, "Você não tem permissão para acessar este certificado");
    }

    return certificate;
  }

  /** Gera o certificado se o curso acabou de ser concluído. Retorna null se já existia ou se ainda não concluiu. */
  async checkAndGenerateCertificate(userId: string, courseId: string): Promise<string | null> {
    try {
      const existing = await prisma.certificate.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      });

      if (existing) {
        return null;
      }

      const [totalLessons, completedLessons] = await Promise.all([
        prisma.lesson.count({ where: { module: { courseId } } }),
        prisma.userProgress.count({
          where: { userId, completed: true, lesson: { module: { courseId } } },
        }),
      ]);

      // Requisitos ainda não cumpridos (aulas ou quizzes obrigatórios): não é um erro, só não emite ainda.
      if (totalLessons > 0 && completedLessons >= totalLessons) {
        if ((await pendingQuizzesForCertificate(userId, courseId)).length > 0) return null;
        const certificate = await this.generateCertificate(userId, courseId);
        return certificate.pdfUrl;
      }

      return null;
    } catch (error) {
      console.error("Erro ao verificar/gerar certificado:", error);
      return null;
    }
  }

  async deleteCertificate(certificateId: string, userId: string): Promise<void> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new HttpError(404, "Certificado não encontrado");
    }

    if (certificate.userId !== userId) {
      throw new HttpError(403, "Você não tem permissão para deletar este certificado");
    }

    await storage.delete(certificateKey(certificate.pdfUrl));
    fs.rmSync(legacyCertificatePath(certificate.pdfUrl), { force: true });

    await prisma.certificate.delete({
      where: { id: certificateId },
    });
  }
}


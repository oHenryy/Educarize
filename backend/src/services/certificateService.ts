import { prisma } from "../config/database";
import PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import { logActivity } from "../utils/activityLogger";

export class CertificateService {
  async generateCertificate(userId: string, courseId: string): Promise<string> {
    const existing = await prisma.certificate.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existing) {
      const fileName = path.basename(existing.pdfUrl);
      const filePath = path.join(process.cwd(), "certificates", fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      await prisma.certificate.delete({
        where: { id: existing.id },
      });
    }
    const [user, course, progress] = await Promise.all([
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
      prisma.userProgress.findMany({
        where: {
          userId,
          completed: true,
        },
        include: {
          lesson: {
            select: {
              module: {
                select: {
                  courseId: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!user || !course) {
      throw new Error("Usuário ou curso não encontrado");
    }

    const courseLessons = await prisma.lesson.findMany({
      where: {
        module: {
          courseId,
        },
      },
    });

    const completedLessons = progress.filter(
      (p) => p.lesson.module.courseId === courseId
    );

    if (courseLessons.length === 0 || completedLessons.length < courseLessons.length) {
      throw new Error("Curso não foi completado (100% de progresso necessário)");
    }

    const certsDir = path.join(process.cwd(), "certificates");
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true });
    }

    const fileName = `certificate_${userId}_${courseId}_${Date.now()}.pdf`;
    const filePath = path.join(certsDir, fileName);
    const writeStream = fs.createWriteStream(filePath);
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    doc.pipe(writeStream);

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

    doc
      .fillColor("#9ca3af")
      .fontSize(8)
      .text(
        `Certificado ID: ${userId.substring(0, 8)}-${courseId.substring(0, 8)}`,
        50,
        510,
        { width: pageWidth, align: "center" }
      );

    doc.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    const pdfUrl = `/certificates/file/${fileName}`;

    const certificate = await prisma.certificate.create({
      data: {
        userId,
        courseId,
        pdfUrl,
      },
    });

    await logActivity({
      action: "CERTIFICATE_GENERATED",
      description: `Certificado gerado para o curso "${course.title}"`,
      resourceId: certificate.id,
      resourceType: "CERTIFICATE",
      userId,
    });

    return pdfUrl;
  }

  async getMyCertificates(userId: string) {
    return await prisma.certificate.findMany({
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
      throw new Error("Certificado não encontrado");
    }

    if (certificate.userId !== userId) {
      throw new Error("Você não tem permissão para acessar este certificado");
    }

    return certificate;
  }

  async checkAndGenerateCertificate(userId: string, courseId: string): Promise<string | null> {
    try {
      const existing = await prisma.certificate.findUnique({
        where: {
          userId_courseId: { userId, courseId },
        },
      });

      if (existing) {
        return existing.pdfUrl;
      }

      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          modules: {
            include: {
              lessons: true,
            },
          },
        },
      });

      if (!course) {
        return null;
      }

      const totalLessons = course.modules.reduce(
        (acc, mod) => acc + mod.lessons.length,
        0
      );

      if (totalLessons === 0) {
        return null;
      }

      const completedLessons = await prisma.userProgress.count({
        where: {
          userId,
          completed: true,
          lesson: {
            module: {
              courseId,
            },
          },
        },
      });

      if (completedLessons >= totalLessons) {
        return await this.generateCertificate(userId, courseId);
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
      throw new Error("Certificado não encontrado");
    }

    if (certificate.userId !== userId) {
      throw new Error("Você não tem permissão para deletar este certificado");
    }

    const fileName = path.basename(certificate.pdfUrl);
    const filePath = path.join(process.cwd(), "certificates", fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.certificate.delete({
      where: { id: certificateId },
    });
  }
}


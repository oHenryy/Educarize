import { Request, Response } from "express";
import { CertificateService, formatVerificationCode, openCertificatePdf } from "../services/certificateService";
import { contentDisposition } from "../utils";
import { sendError } from "../utils/httpError";

const certificateService = new CertificateService();

export const certificateController = {
  async verify(req: Request, res: Response) {
    try {
      res.json(await certificateService.verify(req.params.code));
    } catch (error) {
      sendError(res, error);
    }
  },

  async getMyCertificates(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const certificates = await certificateService.getMyCertificates(userId);
      res.json(certificates);
    } catch (error) {
      sendError(res, error);
    }
  },

  async generateCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({ error: "ID do curso é obrigatório" });
      }

      const certificate = await certificateService.generateCertificate(userId, courseId);
      res.json({
        id: certificate.id,
        pdfUrl: certificate.pdfUrl,
        verificationCode: formatVerificationCode(certificate.verificationCode),
        message: "Certificado gerado com sucesso",
      });
    } catch (error) {
      sendError(res, error);
    }
  },

  async downloadCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const certificate = await certificateService.getCertificateById(id, userId);
      const pdf = await openCertificatePdf(certificate.pdfUrl);

      if (!pdf) {
        return res.status(404).json({ error: "Arquivo do certificado não encontrado" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        contentDisposition("attachment", `certificado_${certificate.courseTitle.replace(/\s+/g, "_")}.pdf`)
      );
      pdf.on("error", (err) => {
        console.error("Erro ao ler o certificado:", err);
        res.destroy(err);
      });
      pdf.pipe(res);
    } catch (error) {
      sendError(res, error);
    }
  },

  async deleteCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await certificateService.deleteCertificate(id, userId);
      res.json({ message: "Certificado deletado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  },
};

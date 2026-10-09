import { Request, Response } from "express";
import { CertificateService, getCertificateFilePath } from "../services/certificateService";
import fs from "fs";
import { sendError } from "../utils/httpError";

const certificateService = new CertificateService();

export const certificateController = {
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
      res.json({ id: certificate.id, pdfUrl: certificate.pdfUrl, message: "Certificado gerado com sucesso" });
    } catch (error) {
      sendError(res, error);
    }
  },

  async downloadCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const certificate = await certificateService.getCertificateById(id, userId);
      const filePath = getCertificateFilePath(certificate.pdfUrl);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Arquivo do certificado não encontrado" });
      }

      const asciiName = `certificado_${certificate.courseTitle}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "_");
      const utf8Name = encodeURIComponent(`certificado_${certificate.courseTitle.replace(/\s+/g, "_")}.pdf`);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`
      );
      res.sendFile(filePath);
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

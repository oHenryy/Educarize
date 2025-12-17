import { Request, Response } from "express";
import { CertificateService } from "../services/certificateService";
import path from "path";
import fs from "fs";

const certificateService = new CertificateService();

export const certificateController = {
  async getMyCertificates(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const certificates = await certificateService.getMyCertificates(userId);
      res.json(certificates);
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Erro ao buscar certificados" });
    }
  },

  async generateCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({ error: "ID do curso é obrigatório" });
      }

      const pdfUrl = await certificateService.generateCertificate(userId, courseId);
      res.json({ pdfUrl, message: "Certificado gerado com sucesso" });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao gerar certificado" });
    }
  },

  async downloadCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const certificate = await certificateService.getCertificateById(id, userId);
      const fileName = path.basename(certificate.pdfUrl);
      const filePath = path.join(process.cwd(), "certificates", fileName);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Arquivo do certificado não encontrado" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="certificado_${certificate.course.title.replace(/\s+/g, "_")}.pdf"`);
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Erro ao baixar certificado" });
    }
  },

  async serveCertificate(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      const filePath = path.join(process.cwd(), "certificates", filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Certificado não encontrado" });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.sendFile(filePath);
    } catch (error: any) {
      res.status(404).json({ error: "Erro ao servir certificado" });
    }
  },

  async deleteCertificate(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await certificateService.deleteCertificate(id, userId);
      res.json({ message: "Certificado deletado com sucesso" });
    } catch (error: any) {
      res.status(404).json({ error: error.message || "Erro ao deletar certificado" });
    }
  },
};


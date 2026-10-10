import { Request, Response } from "express";
import type { FilePurpose } from "@prisma/client";
import { FileService, toFileDto } from "../services/fileService";
import { contentDisposition } from "../utils";
import { HttpError, sendError } from "../utils/httpError";

const fileService = new FileService();

/** Origem da API vista pelo navegador (usada nos links quando PUBLIC_API_URL não está definida). */
const requestOrigin = (req: Request) => `${req.protocol}://${req.get("host")}`;

export class FileController {
  async upload(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) throw new HttpError(400, "Envie o arquivo no campo \"file\"");
      const purpose = (req.body.purpose as string).toUpperCase() as FilePurpose;
      const file = await fileService.upload({
        buffer: req.file.buffer,
        // O multer entrega o nome em latin1; nomes com acentos precisam ser reconvertidos.
        originalName: Buffer.from(req.file.originalname, "latin1").toString("utf8"),
        purpose,
        ownerId: req.user!.userId,
      });
      res.status(201).json(toFileDto(file, requestOrigin(req)));
    } catch (error) {
      sendError(res, error);
    }
  }

  async download(req: Request, res: Response): Promise<void> {
    try {
      const { file, stream } = await fileService.open(req.params.id, req.user);
      const isImage = file.mimeType.startsWith("image/");

      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Length", String(file.size));
      // Imagens abrem no navegador; o resto é sempre baixado (nunca interpretado como página).
      res.setHeader("Content-Disposition", contentDisposition(isImage ? "inline" : "attachment", file.originalName));
      if (file.purpose === "COVER") {
        // Capas aparecem no frontend (outra origem) e nunca mudam: o ID é novo a cada envio.
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else {
        res.setHeader("Cache-Control", "private, no-store");
      }

      stream.on("error", (err) => {
        console.error("Erro ao ler arquivo do storage:", err);
        res.destroy(err);
      });
      stream.pipe(res);
    } catch (error) {
      sendError(res, error);
    }
  }
}

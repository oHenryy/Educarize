import { NextFunction, Request, Response, Router } from "express";
import multer from "multer";
import { FileController } from "../controllers/fileController";
import { authenticate, authorize, optionalAuthenticate, rateLimit } from "../middleware/authMiddleware";
import { MAX_UPLOAD_SIZE } from "../services/fileService";
import { HttpError, sendError } from "../utils/httpError";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const fileController = new FileController();

// O arquivo fica em memória só durante a requisição e vai direto para o storage (disco ou S3).
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_SIZE, files: 1, fields: 5 },
}).single("file");

function parseUpload(req: Request, res: Response, next: NextFunction): void {
  parser(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `O arquivo deve ter no máximo ${MAX_UPLOAD_SIZE / (1024 * 1024)} MB`
          : "Envie um único arquivo no campo \"file\"";
      return sendError(res, new HttpError(err.code === "LIMIT_FILE_SIZE" ? 413 : 400, message));
    }
    sendError(res, err);
  });
}

router.post(
  "/",
  authenticate,
  authorize(["INSTRUCTOR", "ADMIN"]),
  rateLimit(30, 60 * 1000),
  parseUpload,
  validate({ body: s.uploadFileBody }),
  (req, res) => fileController.upload(req, res)
);

// Capas são públicas; anexos exigem acesso ao curso (conferido no serviço).
router.get("/:id", optionalAuthenticate, (req, res) => fileController.download(req, res));

export default router;

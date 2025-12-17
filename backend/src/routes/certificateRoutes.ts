import { Router } from "express";
import { certificateController } from "../controllers/certificateController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.get("/my", authenticate, (req, res) => certificateController.getMyCertificates(req, res));
router.post("/generate", authenticate, (req, res) => certificateController.generateCertificate(req, res));
router.get("/:id/download", authenticate, (req, res) => certificateController.downloadCertificate(req, res));
router.delete("/:id", authenticate, (req, res) => certificateController.deleteCertificate(req, res));
router.get("/file/:filename", (req, res) => certificateController.serveCertificate(req, res));
router.get("/:filename", (req, res) => {
  req.params.filename = req.params.filename;
  return certificateController.serveCertificate(req, res);
});

export default router;


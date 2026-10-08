import { Router } from "express";
import { certificateController } from "../controllers/certificateController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();

router.use(authenticate);

router.get("/my", (req, res) => certificateController.getMyCertificates(req, res));
router.post("/generate", (req, res) => certificateController.generateCertificate(req, res));
router.get("/:id/download", (req, res) => certificateController.downloadCertificate(req, res));
router.delete("/:id", (req, res) => certificateController.deleteCertificate(req, res));

export default router;

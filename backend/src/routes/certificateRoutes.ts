import { Router } from "express";
import { certificateController } from "../controllers/certificateController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();

router.use(authenticate);

router.get("/my", (req, res) => certificateController.getMyCertificates(req, res));
router.post("/generate", validate({ body: s.courseIdBody }), (req, res) => certificateController.generateCertificate(req, res));
router.get("/:id/download", (req, res) => certificateController.downloadCertificate(req, res));
router.delete("/:id", (req, res) => certificateController.deleteCertificate(req, res));

export default router;

import { Router } from "express";
import { LessonController } from "../controllers/lessonController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();
const lessonController = new LessonController();

router.use(authenticate);

router.get("/module/:moduleId", (req, res) => lessonController.listByModule(req, res));
router.get("/:id", (req, res) => lessonController.getById(req, res));
router.post("/", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => lessonController.create(req, res));
router.put("/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => lessonController.update(req, res));
router.delete("/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => lessonController.delete(req, res));
router.get("/:id/attachments", (req, res) => lessonController.getAttachments(req, res));
router.post("/:id/attachments", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => lessonController.addAttachment(req, res));
router.put("/attachments/:attachmentId", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => lessonController.updateAttachment(req, res));
router.delete("/attachments/:attachmentId", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => lessonController.deleteAttachment(req, res));
router.post("/attachments/:attachmentId/download", (req, res) => lessonController.downloadAttachment(req, res));

export default router;

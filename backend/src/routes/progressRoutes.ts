import { Router } from "express";
import { ProgressController } from "../controllers/progressController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const progressController = new ProgressController();

router.use(authenticate);

router.post("/complete", validate({ body: s.lessonIdBody }), (req, res) => progressController.markCompleted(req, res));
router.post("/incomplete", validate({ body: s.lessonIdBody }), (req, res) => progressController.markIncomplete(req, res));
router.get("/course/:courseId", (req, res) => progressController.getCourseProgress(req, res));
router.get("/lesson/:lessonId", (req, res) => progressController.getLessonProgress(req, res));

export default router;


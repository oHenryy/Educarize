import { Router } from "express";
import { CommentController } from "../controllers/commentController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
const commentController = new CommentController();

router.use(authenticate);

router.get("/lesson/:lessonId", (req, res) => commentController.listByLesson(req, res));
router.post("/", (req, res) => commentController.create(req, res));
router.put("/:id", (req, res) => commentController.update(req, res));
router.delete("/:id", (req, res) => commentController.delete(req, res));

export default router;


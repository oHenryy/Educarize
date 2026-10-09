import { Router } from "express";
import { CommentController } from "../controllers/commentController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const commentController = new CommentController();

router.use(authenticate);

router.get("/lesson/:lessonId", (req, res) => commentController.listByLesson(req, res));
router.post("/", validate({ body: s.createCommentBody }), (req, res) => commentController.create(req, res));
router.put("/:id", validate({ body: s.updateCommentBody }), (req, res) => commentController.update(req, res));
router.delete("/:id", (req, res) => commentController.delete(req, res));

export default router;


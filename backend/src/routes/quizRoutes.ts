import { Router } from "express";
import { QuizController } from "../controllers/quizController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const quizController = new QuizController();

router.use(authenticate);

router.get("/module/:moduleId", (req, res) => quizController.getByModule(req, res));
router.post("/attempt", validate({ body: s.quizAttemptBody }), (req, res) => quizController.submitAttempt(req, res));
router.get("/:quizId/attempts", (req, res) => quizController.getAttempts(req, res));
router.post("/", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.createQuizBody }), (req, res) => quizController.create(req, res));
router.put("/:id", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.updateQuizBody }), (req, res) => quizController.update(req, res));
router.delete("/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.delete(req, res));
router.post("/questions", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.createQuestionBody }), (req, res) => quizController.addQuestion(req, res));
router.put("/questions/:id", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.updateQuestionBody }), (req, res) => quizController.updateQuestion(req, res));
router.delete("/questions/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.deleteQuestion(req, res));

export default router;


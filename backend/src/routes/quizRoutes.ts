import { Router } from "express";
import { QuizController } from "../controllers/quizController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();
const quizController = new QuizController();

router.use(authenticate);

router.get("/module/:moduleId", (req, res) => quizController.getByModule(req, res));
router.post("/attempt", (req, res) => quizController.submitAttempt(req, res));
router.get("/:quizId/attempts", (req, res) => quizController.getAttempts(req, res));
router.post("/", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.create(req, res));
router.put("/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.update(req, res));
router.delete("/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.delete(req, res));
router.post("/questions", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.addQuestion(req, res));
router.put("/questions/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.updateQuestion(req, res));
router.delete("/questions/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => quizController.deleteQuestion(req, res));

export default router;


import { Router } from "express";
import { LearningPathController } from "../controllers/learningPathController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();
const learningPathController = new LearningPathController();

router.get("/", (req, res) => learningPathController.list(req, res));
router.get("/my", authenticate, (req, res) => learningPathController.getUserPaths(req, res));
router.get("/:id", (req, res) => learningPathController.getById(req, res));
router.get("/:id/progress", authenticate, (req, res) => learningPathController.getProgress(req, res));

router.post("/", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.create(req, res)
);
router.put("/:id", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.update(req, res)
);
router.delete("/:id", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.delete(req, res)
);

router.post("/:id/courses", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.addCourse(req, res)
);
router.delete("/:id/courses", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => {
  learningPathController.removeCourse(req, res);
});

router.post("/:id/enroll", authenticate, (req, res) => learningPathController.enroll(req, res));

export default router;


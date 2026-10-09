import { Router } from "express";
import { LearningPathController } from "../controllers/learningPathController";
import { authenticate, authorize, optionalAuthenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const learningPathController = new LearningPathController();

router.get("/", optionalAuthenticate, (req, res) => learningPathController.list(req, res));
router.get("/my", authenticate, (req, res) => learningPathController.getUserPaths(req, res));
router.get("/:id", optionalAuthenticate, (req, res) => learningPathController.getById(req, res));
router.get("/:id/progress", authenticate, (req, res) => learningPathController.getProgress(req, res));

router.post("/", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.createLearningPathBody }), (req, res) =>
  learningPathController.create(req, res)
);
router.put("/:id", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.updateLearningPathBody }), (req, res) =>
  learningPathController.update(req, res)
);
router.delete("/:id", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.delete(req, res)
);

router.post("/:id/courses", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.addPathCourseBody }), (req, res) =>
  learningPathController.addCourse(req, res)
);
router.put("/:id/courses/reorder", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.reorderPathCoursesBody }), (req, res) =>
  learningPathController.reorderCourses(req, res)
);
router.delete("/:id/courses/:courseId", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.removeCourse(req, res)
);
// Compatibilidade: courseId no corpo da requisição.
router.delete("/:id/courses", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) =>
  learningPathController.removeCourse(req, res)
);

router.post("/:id/enroll", authenticate, (req, res) => learningPathController.enroll(req, res));

export default router;


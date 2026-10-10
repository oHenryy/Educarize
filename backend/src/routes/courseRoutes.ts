import { Router } from "express";
import { CourseController } from "../controllers/courseController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const courseController = new CourseController();

router.use(authenticate);

router.get("/", validate({ query: s.paginationQuery }), (req, res) => courseController.list(req, res));
router.get("/:id", (req, res) => courseController.getById(req, res));
router.post("/", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.createCourseBody }), (req, res) => courseController.create(req, res));
router.put("/:id", validate({ body: s.updateCourseBody }), (req, res) => courseController.update(req, res));
router.delete("/:id", (req, res) => courseController.delete(req, res));
router.get("/:id/students", (req, res) => courseController.getStudents(req, res));

export default router;

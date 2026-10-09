import { Router } from "express";
import { TagController } from "../controllers/tagController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const tagController = new TagController();

router.get("/", (req, res) => tagController.getAllTags(req, res));
router.get("/popular", validate({ query: s.paginationQuery }), (req, res) => tagController.getPopularTags(req, res));
router.get("/:tagId/courses", (req, res) => tagController.getCoursesByTag(req, res));

router.post("/", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.tagBody }), (req, res) => tagController.createTag(req, res));
router.post("/courses/:courseId", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.courseTagBody }), (req, res) => tagController.addTagToCourse(req, res));
router.delete("/courses/:courseId/:tagId", authenticate, authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => tagController.removeTagFromCourse(req, res));
router.get("/courses/:courseId", (req, res) => tagController.getCourseTags(req, res));

export default router;


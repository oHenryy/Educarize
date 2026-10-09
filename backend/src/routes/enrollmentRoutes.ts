import { Router } from "express";
import { EnrollmentController } from "../controllers/enrollmentController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const enrollmentController = new EnrollmentController();

router.use(authenticate);

router.post("/", validate({ body: s.courseIdBody }), (req, res) => enrollmentController.enroll(req, res));
router.get("/my", (req, res) => enrollmentController.getMyEnrollments(req, res));
router.delete("/:courseId", (req, res) => enrollmentController.cancel(req, res));

export default router;

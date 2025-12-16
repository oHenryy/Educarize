import { Router } from "express";
import { EnrollmentController } from "../controllers/enrollmentController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
const enrollmentController = new EnrollmentController();

router.use(authenticate);

router.post("/", (req, res) => enrollmentController.enroll(req, res));
router.get("/my", (req, res) => enrollmentController.getMyEnrollments(req, res));
router.delete("/:courseId", (req, res) => enrollmentController.cancel(req, res));

export default router;

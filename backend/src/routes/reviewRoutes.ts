import { Router } from "express";
import { ReviewController } from "../controllers/reviewController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
const reviewController = new ReviewController();

router.post("/", authenticate, (req, res) => reviewController.createReview(req, res));
router.put("/:id", authenticate, (req, res) => reviewController.updateReview(req, res));
router.delete("/:id", authenticate, (req, res) => reviewController.deleteReview(req, res));
router.get("/course/:courseId", (req, res) => reviewController.getCourseReviews(req, res));
router.get("/my", authenticate, (req, res) => reviewController.getMyReviews(req, res));

export default router;


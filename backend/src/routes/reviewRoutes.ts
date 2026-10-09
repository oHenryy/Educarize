import { Router } from "express";
import { ReviewController } from "../controllers/reviewController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const reviewController = new ReviewController();

router.post("/", authenticate, validate({ body: s.createReviewBody }), (req, res) => reviewController.createReview(req, res));
router.put("/:id", authenticate, validate({ body: s.updateReviewBody }), (req, res) => reviewController.updateReview(req, res));
router.delete("/:id", authenticate, (req, res) => reviewController.deleteReview(req, res));
router.get("/course/:courseId", validate({ query: s.paginationQuery }), (req, res) => reviewController.getCourseReviews(req, res));
router.get("/my", authenticate, (req, res) => reviewController.getMyReviews(req, res));

export default router;


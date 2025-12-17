import { Router } from "express";
import { InstructorController } from "../controllers/instructorController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();
const instructorController = new InstructorController();

router.get(
  "/dashboard/stats",
  authenticate,
  authorize(["INSTRUCTOR", "ADMIN"]),
  (req, res) => instructorController.getDashboardStats(req, res)
);

export default router;


import { Router } from "express";
import { activityLogController } from "../controllers/activityLogController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authenticate, authorize(["ADMIN"]), (req, res) => activityLogController.getLogs(req, res));
router.get("/:id", authenticate, authorize(["ADMIN"]), (req, res) => activityLogController.getLogById(req, res));

export default router;


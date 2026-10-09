import { Router } from "express";
import { activityLogController } from "../controllers/activityLogController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();

router.get("/", authenticate, authorize(["ADMIN"]), validate({ query: s.paginationQuery }), (req, res) => activityLogController.getLogs(req, res));
router.get("/:id", authenticate, authorize(["ADMIN"]), (req, res) => activityLogController.getLogById(req, res));

export default router;


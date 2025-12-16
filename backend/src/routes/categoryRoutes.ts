import { Router } from "express";
import { CategoryController } from "../controllers/categoryController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();
const categoryController = new CategoryController();

router.use(authenticate);

router.get("/", (_req, res) => categoryController.list(_req, res));
router.post("/", authorize(["ADMIN"]), (req, res) => categoryController.create(req, res));

export default router;

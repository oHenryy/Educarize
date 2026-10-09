import { Router } from "express";
import { CategoryController } from "../controllers/categoryController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const categoryController = new CategoryController();

router.use(authenticate);

router.get("/", (_req, res) => categoryController.list(_req, res));
router.post("/", authorize(["ADMIN"]), validate({ body: s.categoryBody }), (req, res) => categoryController.create(req, res));

export default router;

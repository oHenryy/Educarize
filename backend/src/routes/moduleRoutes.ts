import { Router } from "express";
import { ModuleController } from "../controllers/moduleController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const moduleController = new ModuleController();

router.use(authenticate);

router.get("/course/:courseId", (req, res) => moduleController.listByCourse(req, res));
router.post("/", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.createModuleBody }), (req, res) => moduleController.create(req, res));
router.put("/reorder", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.reorderModulesBody }), (req, res) => moduleController.reorder(req, res));
router.put("/:id", authorize(["INSTRUCTOR", "ADMIN"]), validate({ body: s.updateModuleBody }), (req, res) => moduleController.update(req, res));
router.delete("/:id", authorize(["INSTRUCTOR", "ADMIN"]), (req, res) => moduleController.delete(req, res));

export default router;

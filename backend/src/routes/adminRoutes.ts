import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { authenticate, authorize } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();

router.get("/stats", authenticate, authorize(["ADMIN"]), (req, res) => adminController.getDashboardStats(req, res));
router.get("/users", authenticate, authorize(["ADMIN"]), validate({ query: s.paginationQuery }), (req, res) => adminController.getAllUsers(req, res));
router.get("/users/:id", authenticate, authorize(["ADMIN"]), (req, res) => adminController.getUserById(req, res));
router.put("/users/:id/role", authenticate, authorize(["ADMIN"]), validate({ body: s.updateRoleBody }), (req, res) => adminController.updateUserRole(req, res));
router.put("/users/:id/reset-password", authenticate, authorize(["ADMIN"]), validate({ body: s.resetPasswordBody }), (req, res) => adminController.resetUserPassword(req, res));
router.post("/users/:id/transfer-content", authenticate, authorize(["ADMIN"]), validate({ body: s.transferContentBody }), (req, res) => adminController.transferContent(req, res));
router.delete("/users/:id", authenticate, authorize(["ADMIN"]), (req, res) => adminController.deleteUser(req, res));

export default router;


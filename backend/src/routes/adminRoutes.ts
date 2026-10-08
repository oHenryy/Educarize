import { Router } from "express";
import { adminController } from "../controllers/adminController";
import { authenticate, authorize } from "../middleware/authMiddleware";

const router = Router();

router.get("/stats", authenticate, authorize(["ADMIN"]), (req, res) => adminController.getDashboardStats(req, res));
router.get("/users", authenticate, authorize(["ADMIN"]), (req, res) => adminController.getAllUsers(req, res));
router.get("/users/:id", authenticate, authorize(["ADMIN"]), (req, res) => adminController.getUserById(req, res));
router.put("/users/:id/role", authenticate, authorize(["ADMIN"]), (req, res) => adminController.updateUserRole(req, res));
router.put("/users/:id/reset-password", authenticate, authorize(["ADMIN"]), (req, res) => adminController.resetUserPassword(req, res));
router.post("/users/:id/transfer-content", authenticate, authorize(["ADMIN"]), (req, res) => adminController.transferContent(req, res));
router.delete("/users/:id", authenticate, authorize(["ADMIN"]), (req, res) => adminController.deleteUser(req, res));

export default router;


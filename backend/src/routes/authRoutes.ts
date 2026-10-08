import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate, rateLimit } from "../middleware/authMiddleware";

const router = Router();
const authController = new AuthController();

const authLimiter = rateLimit(20,15 * 60 * 1000);

router.post("/register", authLimiter, (req, res) => authController.register(req, res));
router.post("/login", authLimiter, (req, res) => authController.login(req, res));
router.get("/users", authenticate, (req, res) => authController.getUsers(req, res));
router.get("/me", authenticate, (req, res) => authController.getMe(req, res));
router.post("/change-password", authenticate, (req, res) => authController.changePassword(req, res));

export default router;

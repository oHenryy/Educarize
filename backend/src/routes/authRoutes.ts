import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
const authController = new AuthController();

router.post("/register", (req, res) => authController.register(req, res));
router.post("/login", (req, res) => authController.login(req, res));
router.get("/me", authenticate, (req, res) => authController.getMe(req, res));

export default router;

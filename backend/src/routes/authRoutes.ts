import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate, rateLimit } from "../middleware/authMiddleware";
import { config } from "../config/env";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const authController = new AuthController();

const authLimiter = rateLimit(config.authRateLimitMax, config.authRateLimitWindowMs);

router.post("/register", authLimiter, validate({ body: s.registerBody }), (req, res) => authController.register(req, res));
router.post("/login", authLimiter, validate({ body: s.loginBody }), (req, res) => authController.login(req, res));
router.post("/refresh", (req, res) => authController.refresh(req, res));
router.post("/logout", (req, res) => authController.logout(req, res));

router.post("/forgot-password", authLimiter, validate({ body: s.forgotPasswordBody }), (req, res) =>
  authController.forgotPassword(req, res)
);
router.post("/reset-password", authLimiter, validate({ body: s.resetPasswordWithTokenBody }), (req, res) =>
  authController.resetPassword(req, res)
);
router.post("/verify-email", validate({ body: s.tokenBody }), (req, res) => authController.verifyEmail(req, res));
router.post("/resend-verification", authenticate, authLimiter, (req, res) =>
  authController.resendVerification(req, res)
);

router.get("/users", authenticate, (req, res) => authController.getUsers(req, res));
router.get("/me", authenticate, (req, res) => authController.getMe(req, res));
router.post("/change-password", authenticate, validate({ body: s.changePasswordBody }), (req, res) =>
  authController.changePassword(req, res)
);

export default router;

import { Router } from "express";
import { NotificationController } from "../controllers/notificationController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const notificationController = new NotificationController();

router.use(authenticate);

router.get("/", validate({ query: s.paginationQuery }), (req, res) => notificationController.getMyNotifications(req, res));
router.put("/:id/read", (req, res) => notificationController.markAsRead(req, res));
router.put("/read-all", (req, res) => notificationController.markAllAsRead(req, res));
router.delete("/:id", (req, res) => notificationController.deleteNotification(req, res));
router.get("/unread-count", (req, res) => notificationController.getUnreadCount(req, res));

export default router;


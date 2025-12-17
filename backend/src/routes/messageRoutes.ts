import { Router } from "express";
import { MessageController } from "../controllers/messageController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
const messageController = new MessageController();

router.use(authenticate);

router.post("/", (req, res) => messageController.sendMessage(req, res));
router.get("/conversations", (req, res) => messageController.getConversations(req, res));
router.get("/conversations/:userId", (req, res) => messageController.getConversation(req, res));
router.put("/:id/read", (req, res) => messageController.markAsRead(req, res));
router.put("/conversations/:userId/read", (req, res) => messageController.markConversationAsRead(req, res));
router.get("/unread-count", (req, res) => messageController.getUnreadCount(req, res));
router.delete("/:id", (req, res) => messageController.deleteMessage(req, res));

export default router;


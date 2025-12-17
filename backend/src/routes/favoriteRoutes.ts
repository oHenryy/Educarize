import { Router } from "express";
import { FavoriteController } from "../controllers/favoriteController";
import { authenticate } from "../middleware/authMiddleware";

const router = Router();
const favoriteController = new FavoriteController();

router.use(authenticate);

router.post("/", (req, res) => favoriteController.addFavorite(req, res));
router.delete("/:courseId", (req, res) => favoriteController.removeFavorite(req, res));
router.get("/", (req, res) => favoriteController.getMyFavorites(req, res));
router.get("/:courseId/check", (req, res) => favoriteController.isFavorite(req, res));

export default router;


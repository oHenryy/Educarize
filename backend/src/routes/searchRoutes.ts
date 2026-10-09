import { Router } from "express";
import { SearchController } from "../controllers/searchController";
import { authenticate, optionalAuthenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const searchController = new SearchController();

router.get("/advanced", optionalAuthenticate, validate({ query: s.paginationQuery }), (req, res) => searchController.advancedSearch(req, res));
router.get("/lessons", (req, res) => searchController.searchLessons(req, res));
router.get("/notes", authenticate, (req, res) => searchController.searchNotes(req, res));
router.get("/tags/popular", validate({ query: s.paginationQuery }), (req, res) => searchController.getPopularTags(req, res));
router.get("/suggestions", (req, res) => searchController.getSearchSuggestions(req, res));

export default router;


import { Router } from "express";
import { NoteController } from "../controllers/noteController";
import { authenticate } from "../middleware/authMiddleware";
import { validate } from "../validation/validate";
import * as s from "../validation/schemas";

const router = Router();
const noteController = new NoteController();

router.use(authenticate);

router.post("/", validate({ body: s.createNoteBody }), (req, res) => noteController.createNote(req, res));
router.put("/:id", validate({ body: s.updateNoteBody }), (req, res) => noteController.updateNote(req, res));
router.delete("/:id", (req, res) => noteController.deleteNote(req, res));
router.get("/lesson/:lessonId", (req, res) => noteController.getLessonNotes(req, res));
router.get("/my", (req, res) => noteController.getMyNotes(req, res));

export default router;


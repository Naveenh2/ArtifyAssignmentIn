import { Router } from "express";
import * as notes from "../controllers/notesController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { createNoteSchema, updateNoteSchema } from "../schemas/noteSchemas.js";

const r = Router();

r.use(authMiddleware);

/** Static paths before `/:id` to avoid param shadowing. */
r.get("/insights", notes.insights);
r.get("/", notes.listNotes);
r.post("/", validateBody(createNoteSchema), notes.createNote);
r.post("/:id/generate-summary", notes.generateSummary);
r.post("/:id/share", notes.enableShare);
r.delete("/:id/share", notes.revokeShare);
r.get("/:id", notes.getNote);
r.patch("/:id", validateBody(updateNoteSchema), notes.updateNote);
r.delete("/:id", notes.deleteNote);

export default r;

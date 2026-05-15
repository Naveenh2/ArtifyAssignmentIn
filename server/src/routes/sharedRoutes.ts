import { Router } from "express";
import * as notes from "../controllers/notesController.js";

const r = Router();

/** Public read-only access by share slug */
r.get("/:shareId", notes.getShared);

export default r;

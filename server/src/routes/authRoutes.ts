import { Router } from "express";
import * as auth from "../controllers/authController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, signupSchema } from "../schemas/authSchemas.js";

const r = Router();

r.post("/signup", validateBody(signupSchema), auth.signup);
r.post("/login", validateBody(loginSchema), auth.login);
r.post("/logout", auth.logout);
r.get("/me", authMiddleware, auth.me);

export default r;

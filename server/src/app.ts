import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import noteRoutes from "./routes/noteRoutes.js";
import sharedRoutes from "./routes/sharedRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { env } from "./config/env.js";

/**
 * Express application factory — mounted routes follow REST + MVC style:
 * controllers orchestrate; Prisma lives in controllers/services.
 */
export function createApp() {
  const app = express();
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRoutes);
  app.use("/notes", noteRoutes);
  app.use("/shared", sharedRoutes);

  app.use(errorHandler);
  return app;
}

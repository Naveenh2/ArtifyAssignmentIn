import bcrypt from "bcryptjs";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { signToken } from "../middleware/authMiddleware.js";
import { AppError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

const COOKIE_NAME = "token";
const MS_PER_DAY = 86400000;

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name } = req.body as { email: string; password: string; name?: string };
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      throw new AppError(409, "Email already registered");
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name?.trim() || null,
      },
    });
    const token = signToken({ sub: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 7 * MS_PER_DAY,
      path: "/",
    });
    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    next(e);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new AppError(401, "Invalid email or password");
    }
    const token = signToken({ sub: user.id, email: user.email });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 7 * MS_PER_DAY,
      path: "/",
    });
    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (e) {
    next(e);
  }
}

export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  return res.json({ ok: true });
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.sub;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) {
      throw new AppError(404, "User not found");
    }
    return res.json({ user });
  } catch (e) {
    next(e);
  }
}

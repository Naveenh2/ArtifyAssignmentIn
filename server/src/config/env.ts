import dotenv from "dotenv";

dotenv.config();

/**
 * Centralized environment configuration (fail-fast in production for critical vars).
 * DATABASE_URL must point at a real Postgres host — placeholders like "HOST" cause Prisma P1001.
 */
type EnvKey = "DATABASE_URL" | "JWT_SECRET";

function requireEnv(name: EnvKey): string {
  const v = process.env[name];
  if (!v && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required env: ${name}`);
  }
  if (name === "JWT_SECRET") {
    return v ?? "dev-only-change-me";
  }
  /** Dev-only default if .env missing — use 127.0.0.1:5432 (standard Postgres port). */
  return v ?? "postgresql://postgres:postgres@127.0.0.1:5432/peblo_notes?schema=public";
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: Number(process.env.PORT) || 4000,
  DATABASE_URL: requireEnv("DATABASE_URL"),
  JWT_SECRET: requireEnv("JWT_SECRET"),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? "7d",
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  /** Default works with current Google AI Studio keys (1.5-flash often returns 404). */
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true",
};

import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

const AI_HOURLY_LIMIT = 20;

/** Per-user cap on AI runs (rolling 1 hour). */
export async function assertAiRateLimit(userId: string): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.aIUsage.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (count >= AI_HOURLY_LIMIT) {
    throw new AppError(
      429,
      `AI limit reached (${AI_HOURLY_LIMIT} requests per hour). Try again later.`
    );
  }
}

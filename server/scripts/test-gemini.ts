import dotenv from "dotenv";
import { runCombinedAi } from "../src/services/aiService.js";

dotenv.config();

void runCombinedAi(
  "Meeting notes\n\nWe discussed the internship project. Build Peblo Notes with Next.js and Express. Add AI summaries using Gemini. Deadline next Friday."
)
  .then((r) => console.log("OK", JSON.stringify(r, null, 2)))
  .catch((e) => console.error("FAIL", e.message ?? e));

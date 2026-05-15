import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";

export type AiCombinedResult = {
  summary: string;
  action_items: string[];
  suggested_title: string;
  model: string;
};

const SYSTEM_PROMPT = `You are a productivity assistant. Given note text, respond with ONLY valid JSON (no markdown fences) matching this shape:
{"summary":"string","action_items":["string"],"suggested_title":"string"}
Rules:
- summary: 2-4 sentences, concise.
- action_items: 0-8 concrete next steps; empty array if none.
- suggested_title: short title (max 80 chars), not empty.`;

/**
 * Primary: Google Gemini (assignment / portfolio default).
 * Optional fallback: OpenAI when `OPENAI_API_KEY` is set and Gemini is unavailable.
 */
export async function runCombinedAi(noteText: string): Promise<AiCombinedResult> {
  if (env.GEMINI_API_KEY) {
    try {
      return await runGemini(noteText);
    } catch (e) {
      if (env.OPENAI_API_KEY) {
        return await runOpenAI(noteText);
      }
      throw e instanceof AppError ? e : new AppError(503, "Gemini request failed. Check GEMINI_API_KEY or set OPENAI_API_KEY as fallback.");
    }
  }
  if (env.OPENAI_API_KEY) {
    return runOpenAI(noteText);
  }
  throw new AppError(
    503,
    "AI is not configured. Add GEMINI_API_KEY (recommended) or OPENAI_API_KEY in the server environment."
  );
}

async function runGemini(noteText: string): Promise<AiCombinedResult> {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(SYSTEM_PROMPT + "\n\nNOTE:\n" + noteText);
  const raw = result.response.text();
  return parseAiJson(raw, "gemini-1.5-flash");
}

async function runOpenAI(noteText: string): Promise<AiCombinedResult> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: noteText },
      ],
      temperature: 0.3,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new AppError(502, "OpenAI request failed", err);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  return parseAiJson(raw, "gpt-4o-mini");
}

function parseAiJson(raw: string, model: string): AiCombinedResult {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppError(502, "AI returned invalid JSON");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new AppError(502, "AI returned invalid shape");
  }
  const o = parsed as Record<string, unknown>;
  const summary = typeof o.summary === "string" ? o.summary : "";
  const suggested_title = typeof o.suggested_title === "string" ? o.suggested_title : "Untitled";
  const action_items = Array.isArray(o.action_items)
    ? o.action_items.filter((x): x is string => typeof x === "string")
    : [];
  return { summary, action_items, suggested_title, model };
}

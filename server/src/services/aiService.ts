import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { env } from "../config/env.js";
import { AppError } from "../middleware/errorHandler.js";

export type AiCombinedResult = {
  summary: string;
  action_items: string[];
  suggested_title: string;
  model: string;
};

const aiResponseSchema = z.object({
  summary: z.string().min(1),
  action_items: z.array(z.string()),
  suggested_title: z.string().min(1).max(120),
});

const GEMINI_FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash-lite"];

const SYSTEM_PROMPT = `You are a productivity assistant for a notes app. The user message is plain text extracted from a rich-text note (HTML already removed).

Respond with ONLY valid JSON (no markdown fences) matching:
{"summary":"string","action_items":["string"],"suggested_title":"string"}

Rules:
- summary: 2-4 clear sentences capturing the main ideas. Use bullet phrases only if the note is long or list-heavy.
- action_items: 0-8 concrete, actionable next steps. Prefer items from task lists or implied todos. Empty array if none.
- suggested_title: short, descriptive title (max 80 characters), no surrounding quotes.
- Ignore HTML artifacts, formatting noise, and placeholder text.
- If content was truncated, summarize only what is present.`;

function geminiModelsToTry(): string[] {
  const preferred = env.GEMINI_MODEL.trim();
  const list = preferred ? [preferred, ...GEMINI_FALLBACK_MODELS] : GEMINI_FALLBACK_MODELS;
  return [...new Set(list)];
}

function formatProviderError(e: unknown, provider: string): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error) {
    const msg = e.message.replace(/^\[GoogleGenerativeAI Error\]:\s*/i, "").trim();
    if (msg.includes("429") || /quota|rate limit/i.test(msg)) {
      return `${provider} quota exceeded. Wait a minute and retry, or check billing in Google AI Studio.`;
    }
    if (msg.includes("404") || /not found/i.test(msg)) {
      return `${provider} model unavailable. Set GEMINI_MODEL=gemini-2.5-flash in server/.env`;
    }
    if (msg.includes("API key") || msg.includes("API_KEY")) {
      return `${provider} API key invalid. Check GEMINI_API_KEY in server/.env and restart the server.`;
    }
    return msg.slice(0, 400) || `${provider} request failed`;
  }
  return `${provider} request failed`;
}

function isModelNotFoundError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  return e.message.includes("404") || /not found for API/i.test(e.message);
}

/**
 * Primary: Google Gemini (assignment / portfolio default).
 * Optional fallback: OpenAI when `OPENAI_API_KEY` is set and Gemini is unavailable.
 */
export async function runCombinedAi(
  noteText: string,
  opts?: { truncated?: boolean }
): Promise<AiCombinedResult> {
  const userContent =
    opts?.truncated === true
      ? `${noteText}\n\n(The note was truncated before sending to you.)`
      : noteText;

  if (env.GEMINI_API_KEY) {
    const models = geminiModelsToTry();
    let lastError: unknown;
    for (const modelName of models) {
      try {
        return await runGemini(userContent, modelName);
      } catch (e) {
        lastError = e;
        if (isModelNotFoundError(e)) continue;
        if (env.OPENAI_API_KEY) {
          try {
            return await runOpenAI(userContent);
          } catch {
            /* fall through to Gemini error */
          }
        }
        throw new AppError(503, formatProviderError(e, "Gemini"));
      }
    }
    if (env.OPENAI_API_KEY) {
      try {
        return await runOpenAI(userContent);
      } catch (e) {
        throw new AppError(503, formatProviderError(e, "OpenAI"));
      }
    }
    throw new AppError(503, formatProviderError(lastError, "Gemini"));
  }

  if (env.OPENAI_API_KEY) {
    try {
      return await runOpenAI(userContent);
    } catch (e) {
      throw new AppError(503, formatProviderError(e, "OpenAI"));
    }
  }

  throw new AppError(
    503,
    "AI is not configured. Add GEMINI_API_KEY (recommended) or OPENAI_API_KEY in the server environment."
  );
}

async function runGemini(noteText: string, modelName: string): Promise<AiCombinedResult> {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nNOTE:\n${noteText}`);
  const raw = result.response.text();
  return parseAiJson(raw, modelName);
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
      response_format: { type: "json_object" },
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

  const result = aiResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new AppError(502, "AI returned invalid shape");
  }

  const { summary, action_items, suggested_title } = result.data;
  return {
    summary: summary.trim(),
    action_items: action_items.map((s) => s.trim()).filter(Boolean).slice(0, 8),
    suggested_title: suggested_title.trim().slice(0, 80) || "Untitled",
    model,
  };
}

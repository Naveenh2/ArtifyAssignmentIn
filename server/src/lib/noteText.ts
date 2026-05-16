import crypto from "crypto";

/** Max plain-text length sent to the LLM (avoids token blowups). */
export const MAX_NOTE_TEXT_FOR_AI = 12_000;

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function buildNoteTextForAi(note: {
  title: string;
  content: string;
  category?: string | null;
  tags?: string[];
}): string {
  const body = stripHtml(note.content);
  const parts: string[] = [note.title.trim()];
  if (note.category?.trim()) parts.push(`Category: ${note.category.trim()}`);
  if (note.tags?.length) parts.push(`Tags: ${note.tags.join(", ")}`);
  if (body) parts.push("", body);
  return parts.join("\n").trim();
}

export function hashNoteForAi(note: {
  title: string;
  content: string;
  category?: string | null;
  tags?: string[];
}): string {
  const text = buildNoteTextForAi(note);
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function prepareNoteTextForAi(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_NOTE_TEXT_FOR_AI) {
    return { text, truncated: false };
  }
  return {
    text: `${text.slice(0, MAX_NOTE_TEXT_FOR_AI)}\n\n[Note truncated — only the first portion was analyzed.]`,
    truncated: true,
  };
}

export function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

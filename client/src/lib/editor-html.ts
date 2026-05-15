/** Normalize stored note body for Tiptap (HTML in DB; legacy plain text supported). */
export function toEditorHtml(content: string): string {
  const trimmed = content?.trim() ?? "";
  if (!trimmed) return "<p></p>";
  if (trimmed.startsWith("<")) return content;
  return trimmed
    .split(/\n\n+/)
    .map((block) => {
      const lines = block.split("\n").map(escapeHtml).join("<br>");
      return `<p>${lines || "<br>"}</p>`;
    })
    .join("");
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function countWordsFromHtml(html: string): number {
  const text = stripHtml(html).trim();
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function countCharsFromHtml(html: string): number {
  return stripHtml(html).length;
}

export function stripHtml(html: string): string {
  if (typeof document === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent ?? "";
}

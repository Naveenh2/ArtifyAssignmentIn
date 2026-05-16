import type { AiResult, Insights, Note } from "./types";

/**
 * Browser → same-origin Next.js routes only:
 * - `/api/auth/*` sets an **httpOnly** JWT cookie (BFF pattern for Vercel + Render split).
 * - `/api/backend/*` proxies to Express with that cookie forwarded as `Cookie: token=…`.
 */
const BFF_BACKEND = "/api/backend";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? res.statusText);
  }
  return data as T;
}

async function backendFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...((init?.headers as Record<string, string>) ?? {}) };
  if (init?.body && !(init.body instanceof FormData)) {
    headers["Content-Type"] ??= "application/json";
  }
  const res = await fetch(`${BFF_BACKEND}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}

export const api = {
  signup: async (body: { email: string; password: string; name?: string }) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson<{ user: { id: string; email: string; name: string | null } }>(res);
  },

  login: async (body: { email: string; password: string }) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return parseJson<{ user: { id: string; email: string; name: string | null } }>(res);
  },

  logout: async () => {
    const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    return parseJson<{ ok: boolean }>(res);
  },

  me: async () => {
    const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
    return parseJson<{ user: { id: string; email: string; name: string | null } }>(res);
  },

  notes: (params?: { search?: string; tag?: string; archived?: boolean; sort?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set("search", params.search);
    if (params?.tag) q.set("tag", params.tag);
    if (params?.archived !== undefined) q.set("archived", String(params.archived));
    if (params?.sort) q.set("sort", params.sort);
    const s = q.toString();
    return backendFetch<{ notes: Note[] }>(`/notes${s ? `?${s}` : ""}`);
  },
  note: (id: string) => backendFetch<{ note: Note }>(`/notes/${id}`),
  createNote: (body: Partial<Note> & { tagNames?: string[] }) =>
    backendFetch<{ note: Note }>("/notes", { method: "POST", body: JSON.stringify(body) }),
  patchNote: (id: string, body: Record<string, unknown>) =>
    backendFetch<{ note: Note }>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteNote: (id: string) => backendFetch<void>(`/notes/${id}`, { method: "DELETE" }),
  generateSummary: (id: string, opts?: { regenerate?: boolean }) =>
    backendFetch<AiResult>(`/notes/${id}/generate-summary`, {
      method: "POST",
      body: JSON.stringify({ regenerate: opts?.regenerate ?? false }),
    }),
  shareNote: (id: string) =>
    backendFetch<{ shareId: string; publicUrl: string }>(`/notes/${id}/share`, { method: "POST" }),
  revokeShare: (id: string) => backendFetch<void>(`/notes/${id}/share`, { method: "DELETE" }),
  insights: () => backendFetch<Insights>("/notes/insights"),
  shared: (shareId: string) =>
    backendFetch<{
      note: {
        title: string;
        content: string;
        updatedAt: string;
        category: string | null;
        tags: string[];
      };
    }>(`/shared/${shareId}`),
};

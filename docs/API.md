# Peblo Notes — REST API

## Base URLs

| Consumer | Base URL | Notes |
|----------|-----------|--------|
| **Express (direct)** | `http://127.0.0.1:4000` in dev | Mobile tools, Postman, server-side scripts |
| **Next.js BFF (browser)** | `/api/backend` + path | Same-origin; forwards `Cookie: token=…` to Express |

Set **`CLIENT_ORIGIN`** on Express to your **Next** origin (e.g. `http://localhost:3000` or your Vercel URL).

## Authentication

The API accepts either:

- `Authorization: Bearer <jwt>`, or  
- `Cookie: token=<jwt>` (httpOnly when using the Next BFF pattern).

### `POST /auth/signup`

**Body (JSON):** `email`, `password` (min 8), optional `name`.

**201** — `{ user: { id, email, name }, token }`  
Express may also set `Set-Cookie: token=…` when called directly. **Next.js production:** the Route Handler stores `token` httpOnly on the **frontend** origin and returns `{ user }` only to the browser.

### `POST /auth/login`

**Body:** `{ email, password }`

**200** — `{ user, token }` (see note above for BFF).

### `POST /auth/logout`

**200** — `{ ok: true }` — clears cookie when called with session.

### `GET /auth/me`

**Auth required.**

**200** — `{ user: { id, email, name, createdAt } }`

---

## Notes (authenticated)

### `GET /notes`

| Query | Description |
|-------|-------------|
| search | case-insensitive title + content |
| tag | tag name (exact case-insensitive per user) |
| archived | `true` / `false` |
| sort | `updatedAt_desc` (default) or `updatedAt_asc` |

**200** — `{ notes: Note[] }` — includes `tags[]`, `shareId` or `null`.

### `GET /notes/:id`

**200** — `{ note }` · **404** — not found / not owner

### `POST /notes`

**Body:** `{ title?, content?, category?, tagNames?[] }`

**201** — `{ note }`

### `PATCH /notes/:id`

Partial update: `title`, `content`, `archived`, `category`, `tagNames` (replaces links).

**200** — `{ note }`

### `DELETE /notes/:id`

**204** — deleted.

### `POST /notes/:id/generate-summary`

**Primary:** Google Gemini (`GEMINI_API_KEY`). **Fallback:** OpenAI if Gemini errors and `OPENAI_API_KEY` is set. If neither is configured: **503** with a clear JSON `error` message.

**200** — `{ summary, action_items[], suggested_title, model }` — records `AIUsage`.

### `POST /notes/:id/share`

Creates a public slug if missing; **returns existing** `shareId` if the note is already shared (idempotent).

**200** — `{ shareId, publicUrl }` (`publicUrl` is a path; prepend your web app origin).

### `DELETE /notes/:id/share`

**Revokes** the public link (deletes `SharedNote`). Old URLs return **404**.

**204** — success.

### `GET /notes/insights`

**200** — totals, archived count, recent notes, tag frequency, AI usage by type, 14-day activity.

---

## Public share

### `GET /shared/:shareId`

No auth.

**200** — `{ note: { title, content, updatedAt, category, tags[] } }`  
**404** — revoked or unknown slug

---

## Health

### `GET /health`

**200** — `{ ok: true }`

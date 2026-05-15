# Backend architecture

## Layering (MVC-style)

```
HTTP (Express)
  → routes/*.ts          — mount paths, apply auth + Zod validateBody
  → controllers/*.ts   — orchestration, status codes, map Prisma rows to JSON
  → lib/prisma.ts      — Prisma singleton
  → services/aiService.ts — Gemini (primary) + optional OpenAI fallback; JSON parsing
  → middleware/        — auth JWT, errorHandler, validate
```

- **Models** live in `prisma/schema.prisma` (User, Note, Tag, NoteTag, SharedNote, AIUsage).
- **Validation** uses Zod schemas in `src/schemas/`.
- **Errors** funnel through `middleware/errorHandler.ts` (`AppError`, Zod, 500).

## Authentication

- **bcrypt** hashes at signup (`authController`).
- **JWT** signed with `JWT_SECRET`; payload `{ sub, email }`.
- **Transport:** `Authorization: Bearer` OR `Cookie: token=…` (`authMiddleware`).
- **Public routes:** `/auth/signup`, `/auth/login`, `/health`, `/shared/:shareId`.

## AI pipeline

1. `POST /notes/:id/generate-summary` loads note text.
2. `runCombinedAi` prefers **Gemini**; on failure uses **OpenAI** if `OPENAI_API_KEY` is set.
3. If no keys: `503` with explicit message (UI shows in-dialog + toast).
4. Persists `AIUsage` row for insights.

## Sharing

- `SharedNote` maps `noteId` ↔ unique `shareId` (nanoid).
- **POST** `/notes/:id/share` — idempotent: returns existing link if already shared.
- **DELETE** `/notes/:id/share` — revokes public access (404 for old URL).

## Realtime (Socket.io)

- Same HTTP server as Express in `src/index.ts`.
- Events: `join-note`, `leave-note`, `note-delta`, `note-presence` (MVP; not a CRDT).

## Frontend integration (production)

Next.js **Route Handlers** proxy REST so the browser keeps the JWT in an **httpOnly** cookie on the **Vercel** origin. Socket.io clients connect **directly** to the Render URL (`NEXT_PUBLIC_SOCKET_URL`).

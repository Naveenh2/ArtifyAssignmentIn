# Peblo Notes — AI workspace

**Primary goal:** internship-quality submission and a **portfolio project** for recruiters and technical evaluators.

**Out of scope (by design):** native mobile app, billing, admin panel, complex enterprise modules — **solo** maintainership.

Stack matches the brief: **Next.js 15 (App Router)**, **React + TypeScript**, **Tailwind CSS**, UI primitives in the **shadcn/ui style** (Radix + CVA; see `components.json`), **Express**, **PostgreSQL + Prisma**, **JWT + bcrypt**, **Google Gemini** (optional OpenAI fallback), **npm**, **Node.js 20 LTS**.

---

## Feature checklist (priority order)

1. **Authentication** — signup/login/logout, bcrypt, JWT in **httpOnly cookie** (via Next.js BFF), `middleware` + client guard for `/dashboard`.
2. **Notes workspace** — create/read/update/delete, debounced **auto-save**, archive, **tags + category**.
3. **AI** — summary, action items, suggested title (Gemini primary); loading + in-dialog error when misconfigured or upstream fails.
4. **Search & filter** — debounced keyword search, tag filter, sort by `updatedAt`.
5. **Public share** — copy link; **revoke** removes `SharedNote` (link stops working); public page **without login**.
6. **Insights** — totals, top tags, recent edits, AI usage counts, 14-day activity.

**Nice-to-haves included:** Markdown preview, **optimistic delete** on dashboard, **⌘/Ctrl+S**, **Socket.io** (direct to API host; REST stays on same-origin BFF).

**Accessibility (best effort):** `aria-label` on icon-only controls (e.g. delete), semantic headings, visible focus rings on interactive elements (`Button` / `Input`).

---

## Repository layout

See **[`docs/FOLDER_STRUCTURE.md`](docs/FOLDER_STRUCTURE.md)** for the full tree.

| Path | Role |
|------|------|
| `client/` | Next.js 15 UI, Route Handlers (`/api/auth/*`, `/api/backend/*`), `middleware.ts` |
| `server/` | Express REST, Prisma, AI service, Socket.io |
| `docs/API.md` | REST reference |
| `docs/ARCHITECTURE.md` | Backend layering + auth BFF diagram (text) |

---

## Why a BFF for JWT httpOnly cookies?

Vercel (frontend) and Render (API) run on **different origins**. Browsers will not send an API-only cookie to the Next app.

**Pattern used here:**

1. Browser calls **same-origin** `POST /api/auth/login` (Next Route Handler).
2. Handler forwards credentials to Express, reads `{ token }` from JSON **only on the server**, sets `httpOnly` cookie `token` on the **Next** domain.
3. Data requests use `GET|POST|PATCH|DELETE /api/backend/*`; Next forwards `Cookie: token=…` to Express.

JWT is **never** stored in `localStorage`. Socket.io still connects to **`NEXT_PUBLIC_SOCKET_URL`** (your Render URL in production).

---

## Prerequisites

- **Node.js 20 LTS** and **npm**
- **Neon** (or any) PostgreSQL database
- **Google AI Studio** API key for Gemini (recommended)

---

## Local development

### 1) API (`server/`)

```bash
cd server
cp .env.example .env
```

Required in `.env`:

- `DATABASE_URL` — Neon connection string (`?sslmode=require` if needed)
- `JWT_SECRET` — long random string
- `CLIENT_ORIGIN=http://localhost:3000` — CORS + Socket.io
- `GEMINI_API_KEY` — primary AI (optional: `OPENAI_API_KEY` fallback if Gemini errors)

```bash
npm install
npx prisma db push
npm run db:seed   # optional demo: demo@peblo.app / demo12345
npm run dev       # http://127.0.0.1:4000
```

### 2) Web (`client/`)

```bash
cd client
cp .env.example .env.local
```

Required in `.env.local`:

- `API_INTERNAL_URL=http://127.0.0.1:4000` — **server-side** proxy target (use `127.0.0.1` on Windows)
- `NEXT_PUBLIC_SOCKET_URL=http://127.0.0.1:4000` — Socket.io origin (same as API in dev)

```bash
npm install
npm run dev       # http://localhost:3000
```

Open `/`, sign up or use the seed user, exercise notes → AI → share → revoke → insights.

---

## Deployment (Vercel + Render + Neon)

### Neon

Create a project, copy `DATABASE_URL` into Render service env.

### Render (API)

- **Root directory:** `server`
- **Build:** `npm install && npx prisma generate && npm run build`
- **Start:** `npm start`
- **Env:** `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN=https://<your-vercel-app>.vercel.app`, `GEMINI_API_KEY`, `NODE_ENV=production`, `COOKIE_SECURE=true`

### Vercel (web)

- **Root directory:** `client`
- **Env:**
  - `API_INTERNAL_URL` = public Render URL, e.g. `https://your-api.onrender.com`
  - `NEXT_PUBLIC_SOCKET_URL` = same URL (Socket.io)
  - `COOKIE_SECURE=true` (Route Handler cookie options)

After deploy, confirm `CLIENT_ORIGIN` on Render exactly matches your Vercel URL (no trailing slash mismatch).

---

## Deliverables checklist (submission)

- [ ] **GitHub repo** (this project)
- [ ] **`README.md`** (this file)
- [ ] **`.env.example`** in `client/` and `server/`
- [ ] **Demo UI** — deployed Vercel + Render URLs in README top
- [ ] **5–10 min walkthrough video** — script suggestion:
  1. Problem + stack (30s)
  2. Signup/login + httpOnly note (1m)
  3. Note CRUD + autosave + markdown (2m)
  4. AI assist + missing-key graceful state (1m)
  5. Search/filter + archive (1m)
  6. Share + public page + revoke (1m)
  7. Insights dashboard (1m)
  8. Repo structure + tests/lint (1m)

---

## Scripts

| Location | Command |
|----------|---------|
| `server/` | `npm run dev`, `npm run build`, `npm start`, `npx prisma db push`, `npm run db:seed` |
| `client/` | `npm run dev`, `npm run build`, `npm start` |

---

## API reference

[`docs/API.md`](docs/API.md)

---

## License

MIT — portfolio and assignment use.

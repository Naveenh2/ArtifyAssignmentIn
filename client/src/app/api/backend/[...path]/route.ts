import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getUpstreamApiUrl } from "@/lib/upstream";

export const dynamic = "force-dynamic";

const ALLOWED_ROOTS = new Set(["notes", "shared", "health"]);

/**
 * BFF proxy: forwards REST to the Express server with the httpOnly session cookie
 * so the browser never stores the JWT in JavaScript.
 */
async function proxy(req: NextRequest, segments: string[], method: string) {
  if (!segments.length || !ALLOWED_ROOTS.has(segments[0])) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (segments.some((s) => s.includes(".."))) {
    return NextResponse.json({ error: "Bad path" }, { status: 400 });
  }

  const upstream = getUpstreamApiUrl();
  const target = `${upstream}/${segments.join("/")}${req.nextUrl.search}`;
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;

  const headers: Record<string, string> = {};
  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;
  if (token) headers.Cookie = `${AUTH_COOKIE}=${token}`;

  const init: RequestInit = { method, headers, cache: "no-store" };
  if (method !== "GET" && method !== "HEAD") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength) init.body = buf;
  }

  const res = await fetch(target, init);

  // Express DELETE returns 204 — NextResponse rejects 204 with a body in some runtimes.
  if (res.status === 204 || res.status === 205) {
    return new NextResponse(null, { status: res.status });
  }

  const out = new NextResponse(await res.arrayBuffer(), { status: res.status });
  const ctOut = res.headers.get("content-type");
  if (ctOut) out.headers.set("content-type", ctOut);
  return out;
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "GET");
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "POST");
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "PATCH");
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path ?? [], "DELETE");
}

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, cookieBaseOptions, getUpstreamApiUrl } from "@/lib/upstream";

export const dynamic = "force-dynamic";

/** Proxies login to Express and mirrors the JWT into an httpOnly cookie on the Next.js origin. */
export async function POST(req: NextRequest) {
  const upstream = getUpstreamApiUrl();
  const body = await req.text();
  const res = await fetch(`${upstream}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as { user?: unknown; token?: string; error?: string };
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  if (!data.token || !data.user) {
    return NextResponse.json({ error: "Invalid upstream auth response" }, { status: 502 });
  }
  const jar = await cookies();
  jar.set(AUTH_COOKIE, data.token, cookieBaseOptions());
  return NextResponse.json({ user: data.user });
}

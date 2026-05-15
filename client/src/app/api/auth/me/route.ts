import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, getUpstreamApiUrl } from "@/lib/upstream";

export const dynamic = "force-dynamic";

export async function GET() {
  const upstream = getUpstreamApiUrl();
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const res = await fetch(`${upstream}/auth/me`, {
    headers: { Cookie: `${AUTH_COOKIE}=${token}` },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return NextResponse.json(data, { status: res.status });
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, cookieBaseOptions, getUpstreamApiUrl } from "@/lib/upstream";

export const dynamic = "force-dynamic";

export async function POST() {
  const upstream = getUpstreamApiUrl();
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  await fetch(`${upstream}/auth/logout`, {
    method: "POST",
    headers: token ? { Cookie: `${AUTH_COOKIE}=${token}` } : {},
  }).catch(() => undefined);
  jar.set(AUTH_COOKIE, "", { ...cookieBaseOptions(), maxAge: 0 });
  return NextResponse.json({ ok: true });
}

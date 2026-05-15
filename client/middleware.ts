import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "@/lib/upstream";

/**
 * Server-side guard for dashboard routes — pairs with client `AuthProvider` refresh.
 * Auth cookie is httpOnly; middleware only checks presence, not JWT validity.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    const token = request.cookies.get(AUTH_COOKIE);
    if (!token?.value) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

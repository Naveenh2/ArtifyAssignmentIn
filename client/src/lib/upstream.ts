/**
 * Express API URL for **server-side** Next.js Route Handlers only.
 * Use 127.0.0.1 in dev to avoid IPv6 localhost mismatches on Windows.
 */
export function getUpstreamApiUrl(): string {
  return process.env.API_INTERNAL_URL || process.env.API_URL || "http://127.0.0.1:4000";
}

export const AUTH_COOKIE = "token";

export function cookieBaseOptions() {
  const secure = process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

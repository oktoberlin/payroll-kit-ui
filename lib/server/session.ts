import type { NextRequest, NextResponse } from "next/server";

export const ACCESS_COOKIE = "pk_at";
export const REFRESH_COOKIE = "pk_rt";
const ACCESS_MAX_AGE = 30 * 60; // matches the API's 30 minute access token
const REFRESH_MAX_AGE = 24 * 60 * 60; // and its 1 day refresh token

export function apiOrigin(): string {
  return process.env.API_ORIGIN ?? "http://127.0.0.1:8000";
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    // HTTPS in production; COOKIE_SECURE=0 allows `next start` over plain http://localhost
    secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "1" : process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export function setTokens(response: NextResponse, tokens: { access: string; refresh?: string }) {
  response.cookies.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_MAX_AGE));
  if (tokens.refresh) response.cookies.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(REFRESH_MAX_AGE));
}

export function clearTokens(response: NextResponse) {
  response.cookies.set(ACCESS_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...cookieOptions(0), maxAge: 0 });
}

/**
 * Headers that let the API rate-limit by the real visitor instead of our server's IP.
 * They are only honoured by the API when the shared secret matches.
 */
export function clientIpHeaders(request: NextRequest): Record<string, string> {
  const secret = process.env.PROXY_IP_SECRET;
  if (!secret) return {};
  const ip =
    request.headers.get("x-real-ip") ||
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return ip ? { "x-proxy-secret": secret, "x-client-ip": ip } : { "x-proxy-secret": secret };
}

/** Exchange the refresh token for a new access token, or null if it is no longer valid. */
export async function refreshAccess(refresh: string, request: NextRequest): Promise<string | null> {
  try {
    const response = await fetch(`${apiOrigin()}/api/auth/token/refresh/`, {
      method: "POST",
      headers: { "content-type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access?: string };
    return data.access ?? null;
  } catch {
    return null;
  }
}

/** Mutating requests must come from our own pages (defence in depth on top of SameSite=Lax). */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

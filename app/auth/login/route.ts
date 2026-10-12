import { NextRequest, NextResponse } from "next/server";

import { apiOrigin, clientIpHeaders, isSameOrigin, setTokens } from "@/lib/server/session";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ detail: "Cross-site request blocked." }, { status: 403 });

  let credentials: { username?: string; password?: string };
  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid request." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${apiOrigin()}/api/auth/token/`, {
      method: "POST",
      headers: { "content-type": "application/json", ...clientIpHeaders(request) },
      body: JSON.stringify({ username: credentials.username ?? "", password: credentials.password ?? "" }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "The API is not reachable." }, { status: 502 });
  }

  if (upstream.status === 429) {
    return NextResponse.json({ detail: "Too many sign-in attempts. Try again in a minute." }, { status: 429 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ detail: "Incorrect username or password." }, { status: 401 });
  }
  const tokens = (await upstream.json()) as { access: string; refresh: string };
  const response = NextResponse.json({ ok: true });
  setTokens(response, tokens);
  return response;
}

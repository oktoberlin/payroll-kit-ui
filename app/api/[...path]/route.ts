import { NextRequest, NextResponse } from "next/server";

import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  apiOrigin,
  clearTokens,
  clientIpHeaders,
  isSameOrigin,
  refreshAccess,
  setTokens,
} from "@/lib/server/session";

// Hop-by-hop headers and ones fetch recomputes.
const SKIP = new Set(["connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length", "host"]);
// Never forwarded to the API: our own cookies and anything that could spoof the client IP.
const DROP_REQUEST = new Set(["cookie", "authorization", "x-proxy-secret", "x-client-ip", "origin", "referer"]);

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, path: string[], body: ArrayBuffer | undefined, token?: string) {
  const target = new URL(`${apiOrigin()}/api/${path.join("/")}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!SKIP.has(name) && !DROP_REQUEST.has(name)) headers.set(key, value);
  });
  for (const [key, value] of Object.entries(clientIpHeaders(request))) headers.set(key, value);
  if (token) headers.set("authorization", `Bearer ${token}`);

  return fetch(target, { method: request.method, headers, body, redirect: "manual", cache: "no-store" });
}

async function proxy(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const unsafe = request.method !== "GET" && request.method !== "HEAD";
  if (unsafe && !isSameOrigin(request)) {
    return NextResponse.json({ detail: "Cross-site request blocked." }, { status: 403 });
  }

  const body = unsafe ? await request.arrayBuffer() : undefined; // buffered once so a retry can replay it
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value;
  let access = request.cookies.get(ACCESS_COOKIE)?.value;
  let renewed: string | undefined;

  let upstream: Response;
  try {
    upstream = await forward(request, path, body, access);
    if (upstream.status === 401 && refresh) {
      const fresh = await refreshAccess(refresh, request);
      if (fresh) {
        access = renewed = fresh;
        upstream = await forward(request, path, body, fresh);
      }
    }
  } catch {
    return NextResponse.json({ detail: "The API is not reachable." }, { status: 502 });
  }

  if (upstream.status === 401) {
    const expired = NextResponse.json(
      { code: "session_expired", detail: "Your session has expired." },
      { status: 401 },
    );
    clearTokens(expired);
    return expired;
  }

  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!SKIP.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") headers.append(key, value);
  });
  const response = new NextResponse(upstream.status === 204 ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
  if (renewed) setTokens(response, { access: renewed });
  return response;
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

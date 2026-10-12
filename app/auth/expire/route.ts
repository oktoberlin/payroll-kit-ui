import { NextResponse } from "next/server";

import { clearTokens } from "@/lib/server/session";

/** Demo helper behind "Simulate session expiry": drops both tokens so the next request is a 401. */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearTokens(response);
  return response;
}

import { NextResponse } from "next/server";

import { clearTokens } from "@/lib/server/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearTokens(response);
  return response;
}

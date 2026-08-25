import { NextResponse } from "next/server";
import { clearWorkspaceCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * DELETE /api/session
 * Clears the session cookie — used by "Clear Session / Disconnect".
 */
export async function DELETE() {
  await clearWorkspaceCookie();
  return NextResponse.json({ ok: true });
}

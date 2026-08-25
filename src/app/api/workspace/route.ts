import { NextRequest, NextResponse } from "next/server";
import { hashPasscode, verifyPasscode } from "@/lib/passcode";
import {
  createWorkspace,
  findWorkspaceByPasscodeHash,
  isUsingInMemoryStore,
  type Workspace,
} from "@/lib/store";
import { setWorkspaceCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * POST /api/workspace
 * Body: { "passcode": "..." }
 *
 * Opens an existing workspace when the passcode exists, otherwise creates a new
 * one automatically. On success sets a 1-year HTTP-only session cookie with the
 * workspace ID.
 */
export async function POST(request: NextRequest) {
  let passcode: unknown;

  try {
    const body = await request.json();
    passcode = body?.passcode;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (typeof passcode !== "string" || passcode.trim().length < 4) {
    return NextResponse.json(
      { error: "Passcode must be at least 4 characters long." },
      { status: 400 }
    );
  }

  const passcodeHash = hashPasscode(passcode);
  const existing = await findWorkspaceByPasscodeHash(passcodeHash);

  let workspace: Workspace;
  let isNew = false;

  if (existing) {
    if (!verifyPasscode(passcode, existing.passcode_hash)) {
      return NextResponse.json(
        { error: "Passcode does not match this workspace." },
        { status: 401 }
      );
    }
    workspace = existing;
  } else {
    workspace = await createWorkspace(passcodeHash);
    isNew = true;
  }

  await setWorkspaceCookie(workspace.id);

  return NextResponse.json({
    workspaceId: workspace.id,
    isNew,
    storage: isUsingInMemoryStore() ? "memory" : "supabase",
  });
}

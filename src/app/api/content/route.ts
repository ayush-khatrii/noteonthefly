import { NextRequest, NextResponse } from "next/server";
import { decrypt, encrypt, isEncryptionEnabled } from "@/lib/crypto";
import { getWorkspaceIdFromCookie } from "@/lib/session";
import {
  getWorkspaceById,
  isUsingInMemoryStore,
  saveWorkspaceContent,
} from "@/lib/store";

export const runtime = "nodejs";

/**
 * GET /api/content
 * Returns the decrypted document body for the session workspace.
 */
export async function GET() {
  const workspaceId = await getWorkspaceIdFromCookie();

  if (!workspaceId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const content = decrypt(
    workspace.encrypted_content,
    workspace.iv,
    workspace.auth_tag
  );

  return NextResponse.json({
    content,
    workspaceId,
    updatedAt: workspace.updated_at,
    storage: isUsingInMemoryStore() ? "memory" : "supabase",
    encryption: isEncryptionEnabled() ? "aes-256-gcm" : "plaintext",
  });
}

/**
 * POST /api/content
 * Body: { "content": "<html…>" }
 * Encrypts the document body with AES-256-GCM before persisting it.
 */
export async function POST(request: NextRequest) {
  const workspaceId = await getWorkspaceIdFromCookie();

  if (!workspaceId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let content: unknown;

  try {
    const body = await request.json();
    content = body?.content;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof content !== "string") {
    return NextResponse.json({ error: "Content must be a string." }, { status: 400 });
  }

  const workspace = await getWorkspaceById(workspaceId);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const { encryptedContent, iv, authTag } = encrypt(content);
  await saveWorkspaceContent(workspaceId, encryptedContent, iv, authTag);

  return NextResponse.json({
    ok: true,
    updatedAt: new Date().toISOString(),
  });
}

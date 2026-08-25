import crypto from "node:crypto";
import { getSupabaseServerClient } from "./supabase";

/**
 * Data access layer for workspaces.
 *
 * Works against Supabase when it is configured, otherwise transparently uses a
 * local in-memory Map so the app remains fully functional with zero setup.
 */

export type Workspace = {
  id: string;
  passcode_hash: string;
  encrypted_content: string;
  iv: string;
  auth_tag: string;
  updated_at: string | null;
};

const memoryStore = new Map<string, Workspace>();

/** True when the app is running on the in-memory fallback instead of Supabase. */
export function isUsingInMemoryStore(): boolean {
  return !getSupabaseServerClient();
}

export async function findWorkspaceByPasscodeHash(
  passcodeHash: string
): Promise<Workspace | null> {
  const client = getSupabaseServerClient();

  if (client) {
    const { data, error } = await client
      .from("workspaces")
      .select("id, passcode_hash, encrypted_content, iv, auth_tag, updated_at")
      .eq("passcode_hash", passcodeHash)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to query workspace: ${error.message}`);
    }

    return (data as Workspace) ?? null;
  }

  return memoryStore.get(passcodeHash) ?? null;
}

export async function createWorkspace(passcodeHash: string): Promise<Workspace> {
  const client = getSupabaseServerClient();
  const now = new Date().toISOString();
  const row = {
    passcode_hash: passcodeHash,
    encrypted_content: "",
    iv: "",
    auth_tag: "",
    updated_at: now,
  };

  if (client) {
    const { data, error } = await client
      .from("workspaces")
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`);
    }

    return data as Workspace;
  }

  const workspace: Workspace = { id: crypto.randomUUID(), ...row };
  memoryStore.set(passcodeHash, workspace);
  return workspace;
}

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const client = getSupabaseServerClient();

  if (client) {
    const { data, error } = await client
      .from("workspaces")
      .select("id, passcode_hash, encrypted_content, iv, auth_tag, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load workspace: ${error.message}`);
    }

    return (data as Workspace) ?? null;
  }

  for (const workspace of memoryStore.values()) {
    if (workspace.id === id) {
      return workspace;
    }
  }

  return null;
}

export async function saveWorkspaceContent(
  id: string,
  encryptedContent: string,
  iv: string,
  authTag: string
): Promise<void> {
  const client = getSupabaseServerClient();
  const now = new Date().toISOString();

  if (client) {
    const { error } = await client
      .from("workspaces")
      .update({
        encrypted_content: encryptedContent,
        iv,
        auth_tag: authTag,
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to save workspace content: ${error.message}`);
    }

    return;
  }

  const workspace = [...memoryStore.values()].find((item) => item.id === id);

  if (workspace) {
    workspace.encrypted_content = encryptedContent;
    workspace.iv = iv;
    workspace.auth_tag = authTag;
    workspace.updated_at = now;
  }
}

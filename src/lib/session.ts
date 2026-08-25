import { cookies } from "next/headers";

/**
 * HTTP-only session cookie helpers.
 *
 * The cookie only stores the workspace ID — it never contains the passcode —
 * and is valid for one year so devices stay connected indefinitely.
 */

export const WORKSPACE_COOKIE = "workspace_id";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

export async function getWorkspaceIdFromCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(WORKSPACE_COOKIE)?.value ?? null;
}

export async function setWorkspaceCookie(workspaceId: string): Promise<void> {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearWorkspaceCookie(): Promise<void> {
  const store = await cookies();
  store.set(WORKSPACE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

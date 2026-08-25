import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single connection client utility for Supabase.
 *
 * If the Supabase env vars are missing the app does NOT break — the data layer
 * falls back to an in-memory store (see `lib/store.ts`) so the UI stays fully
 * operational.
 *
 * Key strategy (new Supabase "Publishable/Secret" key system):
 * - The SERVER client uses the privileged Secret key (`SUPABASE_SERVICE_ROLE_KEY`,
 *   the modern `sb_secret_…` / legacy `service_role`) so the API routes can
 *   read & write workspaces regardless of RLS. The passcode cookie is the
 *   gate, and document bodies are encrypted at rest anyway.
 * - The BROWSER client uses the Publishable key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`,
 *   the modern `sb_publishable_…` / legacy `anon`) which is safe to expose.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? null;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && (supabaseAnonKey || supabaseServiceKey)
);

let serverClient: SupabaseClient | null = null;

/** Server-side Supabase client (used inside API routes / Server Actions). */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!serverClient) {
    serverClient = createClient(
      supabaseUrl!,
      supabaseServiceKey ?? supabaseAnonKey!,
      {
        auth: { persistSession: false },
      }
    );
  }

  return serverClient;
}

let browserClient: SupabaseClient | null = null;

/** Browser-side Supabase client (optional, for client components). */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined" || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}

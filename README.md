# Note on the Go

A distraction-free, minimalist document editor — fully dark mode, passcode-only
auth, and AES-256-GCM encrypted notes. Built with **Next.js (App Router)**,
**Tailwind CSS v4**, **shadcn/ui**, the **kibo-ui Editor** (TipTap), and
**Supabase**.

## Features

- **Passcode-only auth** — type a passcode to open an existing workspace or
  automatically create a new one. Passcodes are hashed with **bcrypt**; the
  session is a secure, HTTP-only cookie valid for **1 year**.
- **Encryption** — document bodies are encrypted with **AES-256-GCM** before
  they touch the database (`lib/crypto.ts`). Falls back to clear text (with a
  server warning) when `ENCRYPTION_KEY` is missing.
- **Editor** — fullscreen, borderless rich-text canvas powered by the kibo-ui
  Editor (TipTap) with slash commands, bubble menu, and a formatting menu.
- **Hamburger menu** — all app controls live in a slide-out drawer:
  Sync Device / Lock Workspace panel, formatting controls, and a
  Clear Session / Disconnect button.
- **Auto-save** — debounced background save 2 seconds after you stop typing.
- **Graceful fallback** — if Supabase env vars are missing, a local in-memory
  store keeps the app fully operational.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

Copy `.env.local.example` to `.env.local` and fill in what you need. The app
works out of the box with everything blank (in-memory store + clear-text
fallback), so you can start writing immediately.

| Variable                    | Required | Description                                                        |
| --------------------------- | -------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`  | optional | Supabase project URL (blank → in-memory fallback)                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | Supabase **Publishable** key / legacy anon — browser-safe (blank → in-memory fallback) |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Supabase **Secret** key / legacy service_role — **server-only**. API routes use it to read/write regardless of RLS |
| `ENCRYPTION_KEY`            | optional | AES key — 64 hex chars or any long secret (blank → clear text + warning) |
| `BCRYPT_SALT`               | optional | Fixed bcrypt salt, format `$2b$10$` + 22 chars (blank → built-in default) |

### Database schema (Supabase)

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passcode_hash TEXT NOT NULL UNIQUE,
  encrypted_content TEXT NOT NULL DEFAULT '',
  iv TEXT NOT NULL DEFAULT '',
  auth_tag TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

> Row Level Security: keep the table private (`RLS` on, no policies) — all reads
> and writes happen through the Next.js API routes, which use the service-level
> anon key server-side. The passcode is never sent to the browser again after
> the initial request.

## Project structure

```
src/
  app/
    page.tsx                     # Landing page — single passcode input
    workspace/page.tsx           # Guarded editor page (server)
    api/
      workspace/route.ts         # POST — open/create workspace (bcrypt + cookie)
      content/route.ts           # GET/POST — load/save encrypted content
      session/route.ts           # DELETE — clear session cookie
  components/
    ui/…                         # shadcn/ui components (button, sheet, etc.)
    kibo-ui/editor/…             # kibo-ui Editor (TipTap)
    workspace/workspace-editor.tsx # Editor + hamburger menu + auto-save
  lib/
    crypto.ts                    # AES-256-GCM encrypt/decrypt
    passcode.ts                  # bcrypt hashing (deterministic salt)
    supabase.ts                  # Supabase client utilities
    store.ts                     # Data layer (Supabase or in-memory fallback)
    session.ts                   # HTTP-only cookie helpers
    utils.ts                     # cn() helper
```

## Notes

- `BCRYPT_SALT` uses a fixed app-wide salt so `passcode_hash` stays
  deterministic — this lets the bcrypt hash double as the `UNIQUE` lookup key
  required by the schema while the raw passcode is never stored.
- The dev server generates `AGENTS.md`/`CLAUDE.md` by default; disable with
  `agentRules: false` in `next.config.ts` if you don't want them.

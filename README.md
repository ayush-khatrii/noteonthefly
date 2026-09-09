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

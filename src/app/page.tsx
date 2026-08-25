"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiLoaderLine,
  RiLock2Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function HomePage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (passcode.trim().length < 4 || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      router.push("/workspace");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-foreground/10">
          <RiLock2Line className="size-5" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Note on the Go
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Type a passcode to open or create your private workspace.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3">
          <Input
            type="password"
            autoFocus
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Enter a passcode…"
            autoComplete="off"
            className="h-11 rounded-lg text-center text-sm tracking-widest"
            aria-label="Workspace passcode"
          />
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={loading || passcode.trim().length < 4}
            className="h-11 rounded-lg"
          >
            {loading ? (
              <RiLoaderLine className="animate-spin" />
            ) : (
              <RiArrowRightLine />
            )}
            {loading ? "Opening…" : "Enter workspace"}
          </Button>
        </form>

        <p className="mt-6 text-xs text-muted-foreground/70">
          Passcodes are hashed with bcrypt. Documents are encrypted with
          AES-256-GCM.
        </p>
      </div>
    </main>
  );
}

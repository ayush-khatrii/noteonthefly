"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import {
  EditorBubbleMenu,
  EditorClearFormatting,
  EditorFormatBold,
  EditorFormatCode,
  EditorFormatItalic,
  EditorFormatStrike,
  EditorNodeBulletList,
  EditorNodeCode,
  EditorNodeHeading1,
  EditorNodeHeading2,
  EditorNodeHeading3,
  EditorNodeOrderedList,
  EditorNodeQuote,
  EditorNodeTaskList,
  EditorNodeText,
  EditorProvider,
  EditorSelector,
} from "@/components/kibo-ui/editor";
import {
  RiCloudLine,
  RiLoaderLine,
  RiLockLine,
  RiLogoutBoxLine,
  RiMenuLine,
  RiSave3Line,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import "tippy.js/dist/tippy.css";

type SaveState = "idle" | "saving" | "saved" | "error";

type ContentMeta = {
  workspaceId: string;
  storage: string;
  encryption: string;
  updatedAt: string | null;
};

const AUTOSAVE_DELAY_MS = 2000;

export function WorkspaceEditor() {
  const router = useRouter();

  const [initialContent, setInitialContent] = useState<string>("");
  const [loaded, setLoaded] = useState(false);
  const [meta, setMeta] = useState<ContentMeta | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [revision, setRevision] = useState(0);

  const contentRef = useRef<string>("");
  const dirtyRef = useRef(false);

  /* ---- Load document body once on mount ---- */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch("/api/content");
        if (response.status === 401) {
          router.replace("/");
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (cancelled) {
          return;
        }
        setInitialContent(data.content ?? "");
        setMeta({
          workspaceId: data.workspaceId ?? "",
          storage: data.storage ?? "unknown",
          encryption: data.encryption ?? "unknown",
          updatedAt: data.updatedAt ?? null,
        });
        setLastSaved(data.updatedAt ? new Date(data.updatedAt) : null);
      } catch {
        // Keep a blank, fully operational editor on any failure.
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  /* ---- Debounced auto-save: fires 2s after typing stops ---- */
  useEffect(() => {
    if (revision === 0) {
      return;
    }

    setSaveState("saving");

    const timer = setTimeout(async () => {
      const content = contentRef.current;

      try {
        const response = await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error("Save failed");
        }

        dirtyRef.current = false;
        setSaveState("saved");
        setLastSaved(new Date());
      } catch {
        setSaveState("error");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [revision]);

  /* ---- Warn before leaving with unsaved changes ---- */
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleUpdate = useCallback(({ editor }: { editor: Editor }) => {
    contentRef.current = editor.getHTML();
    dirtyRef.current = true;
    setSaveState("idle");
    setRevision((value) => value + 1);
  }, []);

  /* ---- Flush any pending save, then clear the session ---- */
  const handleDisconnect = useCallback(async () => {
    if (dirtyRef.current) {
      try {
        await fetch("/api/content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: contentRef.current }),
        });
      } catch {
        // Best-effort final save — never block the disconnect.
      }
    }

    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch {
      // Ignore — the cookie is cleared on the client next.
    }

    router.replace("/");
    router.refresh();
  }, [router]);

  if (!loaded) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <RiLoaderLine className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <EditorProvider
      className="h-full w-full"
      content={initialContent}
      onUpdate={handleUpdate}
      placeholder="Start writing…"
      editorContainerProps={{ className: "h-full w-full overflow-y-auto" }}
    >
      <EditorBubbleMenu>
        <EditorFormatBold hideName />
        <EditorFormatItalic hideName />
        <EditorFormatStrike hideName />
        <EditorFormatCode hideName />
      </EditorBubbleMenu>

      <WorkspaceMenu
        meta={meta}
        saveState={saveState}
        lastSaved={lastSaved}
        onDisconnect={handleDisconnect}
      />
    </EditorProvider>
  );
}

/* ===========================================================================
   Hamburger menu — all app logic & controls live here
=========================================================================== */
type WorkspaceMenuProps = {
  meta: ContentMeta | null;
  saveState: SaveState;
  lastSaved: Date | null;
  onDisconnect: () => void;
};

function WorkspaceMenu({
  meta,
  saveState,
  lastSaved,
  onDisconnect,
}: WorkspaceMenuProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="fixed top-4 left-4 z-40 size-9 rounded-lg text-muted-foreground/70 transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <RiMenuLine className="size-4" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="gap-0 p-0">
        <SheetHeader className="border-b border-border p-5 pr-12">
          <SheetTitle className="text-sm font-semibold">
            Note on the Go
          </SheetTitle>
          <SheetDescription className="text-xs">
            All controls for your workspace.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
          <SyncPanel
            meta={meta}
            saveState={saveState}
            lastSaved={lastSaved}
            onLock={onDisconnect}
          />
          <FormattingPanel />
        </div>

        <SheetFooter className="border-t border-border p-5">
          <Button
            variant="destructive"
            className="w-full"
            onClick={onDisconnect}
          >
            <RiLogoutBoxLine />
            Clear Session / Disconnect
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

type SyncPanelProps = {
  meta: ContentMeta | null;
  saveState: SaveState;
  lastSaved: Date | null;
  onLock: () => void;
};

/* --- Panel 1: Sync Device / Lock Workspace --- */
function SyncPanel({
  meta,
  saveState,
  lastSaved,
  onLock,
}: SyncPanelProps) {
  const statusLabel =
    saveState === "saving"
      ? "Saving…"
      : saveState === "saved"
        ? "All changes saved"
        : saveState === "error"
          ? "Sync error — will retry"
          : lastSaved
            ? "Connected"
            : "Not saved yet";

  const statusColor =
    saveState === "error"
      ? "bg-destructive"
      : saveState === "saving"
        ? "bg-muted-foreground/60"
        : "bg-emerald-400";

  return (
    <section className="flex flex-col gap-3">
      <PanelTitle icon={<RiCloudLine className="size-4" />} title="Sync Device" />

      <div className="rounded-lg border border-border bg-muted/30 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Connection</span>
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
            <span className={`size-1.5 rounded-full ${statusColor}`} />
            {statusLabel}
          </span>
        </div>

        <Separator className="my-3" />

        <dl className="flex flex-col gap-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Storage</dt>
            <dd className="font-medium text-foreground">
              {meta?.storage === "supabase" ? "Supabase" : "Local (fallback)"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Encryption</dt>
            <dd className="font-medium text-foreground">
              {meta?.encryption === "aes-256-gcm"
                ? "AES-256-GCM"
                : "Plaintext (dev)"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Last synced</dt>
            <dd className="font-medium text-foreground">
              {lastSaved ? formatTime(lastSaved) : "—"}
            </dd>
          </div>
          {meta?.workspaceId ? (
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="font-mono font-medium text-foreground">
                {shortId(meta.workspaceId)}
              </dd>
            </div>
          ) : null}
        </dl>

        <Button
          variant="secondary"
          className="mt-3.5 w-full"
          onClick={onLock}
        >
          <RiLockLine />
          Lock Workspace
        </Button>
      </div>
    </section>
  );
}

/* --- Panel 2: Formatting controls --- */
function FormattingPanel() {
  const { editor } = useCurrentEditor();

  const blockTitle = (() => {
    if (!editor) {
      return "Text";
    }
    if (editor.isActive("heading", { level: 1 })) {
      return "Heading 1";
    }
    if (editor.isActive("heading", { level: 2 })) {
      return "Heading 2";
    }
    if (editor.isActive("heading", { level: 3 })) {
      return "Heading 3";
    }
    return "Text";
  })();

  return (
    <section className="flex flex-col gap-3">
      <PanelTitle icon={<RiSave3Line className="size-4" />} title="Formatting" />

      <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-1">
        <EditorSelector title={blockTitle}>
          <EditorNodeText hideName={false} />
          <EditorNodeHeading1 hideName={false} />
          <EditorNodeHeading2 hideName={false} />
          <EditorNodeHeading3 hideName={false} />
        </EditorSelector>

        <Separator className="my-1" />

        <EditorFormatBold hideName={false} />
        <EditorFormatItalic hideName={false} />
        <EditorFormatStrike hideName={false} />

        <Separator className="my-1" />

        <EditorNodeBulletList hideName={false} />
        <EditorNodeOrderedList hideName={false} />
        <EditorNodeTaskList hideName={false} />

        <Separator className="my-1" />

        <EditorNodeCode hideName={false} />
        <EditorFormatCode hideName={false} />
        <EditorNodeQuote hideName={false} />

        <Separator className="my-1" />

        <EditorClearFormatting hideName={false} />
      </div>
    </section>
  );
}

/* --- Shared bits --- */
function PanelTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="flex size-6 items-center justify-center rounded-md bg-muted text-foreground">
        {icon}
      </span>
      {title}
    </h2>
  );
}

function shortId(id: string): string {
  return `${id.slice(0, 8)}…`;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "medium",
    dateStyle: "short",
  }).format(date);
}

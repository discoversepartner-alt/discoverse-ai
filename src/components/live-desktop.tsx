import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { startDesktop, stopDesktop, runKite, type KiteStep, type DesktopSession } from "@/server/desktop.functions";

interface LiveDesktopProps {
  goal?: string | null;
  onClose: () => void;
  onComplete?: (summary: string) => void;
}

type Status = "idle" | "starting" | "ready" | "running" | "error";

export function LiveDesktop({ goal, onClose, onComplete }: LiveDesktopProps) {
  const startFn = useServerFn(startDesktop);
  const stopFn = useServerFn(stopDesktop);
  const kiteFn = useServerFn(runKite);

  const [status, setStatus] = useState<Status>("idle");
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [steps, setSteps] = useState<KiteStep[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<string>("");

  async function launch() {
    setStatus("starting");
    setError(null);
    try {
      const s = await startFn({ data: {} });
      setSession(s);
      setStatus("ready");
      // Auto-start Kite if a goal was passed in
      if (goal && goal.trim()) {
        await runGoal(s.sandboxId, goal.trim());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to launch desktop");
      setStatus("error");
    }
  }

  async function runGoal(sandboxId: string, g: string) {
    setActiveGoal(g);
    setSteps([]);
    setSummary(null);
    setStatus("running");
    try {
      const result = await kiteFn({ data: { sandboxId, goal: g } });
      setSteps(result.steps);
      setSummary(result.summary);
      setStatus("ready");
      onComplete?.(result.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kite failed");
      setStatus("error");
    }
  }

  async function shutdown() {
    if (session) {
      try {
        await stopFn({ data: { sandboxId: session.sandboxId } });
      } catch {
        // ignore — sandbox may have already been reaped
      }
    }
    setSession(null);
    setSteps([]);
    setSummary(null);
    setStatus("idle");
    onClose();
  }

  return (
    <aside className="flex h-full w-full flex-col border-l border-border/60 bg-surface/40 backdrop-blur lg:w-[520px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-6 w-6 items-center justify-center">
            <span className={`absolute inset-0 rounded-full blur-md ${status === "running" ? "bg-primary/50 animate-pulse-glow" : "bg-primary/20"}`} />
            <span className="relative text-sm" aria-hidden>◈</span>
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm">Kite · live desktop</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{statusLabel(status)}</p>
          </div>
        </div>
        <button
          onClick={shutdown}
          className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-surface hover:text-foreground"
          aria-label="Close live desktop"
        >
          {session ? "Stop & close" : "Close"}
        </button>
      </div>

      {/* Stream / placeholder */}
      <div className="relative flex-1 overflow-hidden bg-black">
        {status === "idle" && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="relative flex h-14 w-14 items-center justify-center">
              <span className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/30 blur-2xl" />
              <span className="relative text-lg text-primary" aria-hidden>◈</span>
            </div>
            <h3 className="mt-4 font-display text-lg text-foreground">Launch Kite</h3>
            <p className="mt-1.5 max-w-xs text-xs text-muted-foreground">
              {goal ? `Spin up a real desktop and let Kite work on: "${truncate(goal, 80)}"` : "Spin up a fresh Linux desktop with Firefox. You'll see Kite click and type live."}
            </p>
            <button
              onClick={launch}
              className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground glow-amber transition-opacity hover:opacity-90"
            >
              {goal ? "Launch & run goal" : "Launch desktop"}
            </button>
            <p className="mt-3 text-[10px] text-muted-foreground">~10s to boot · ~$0.20/hr while open</p>
          </div>
        )}

        {status === "starting" && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <p className="mt-3 text-xs text-muted-foreground">Booting desktop sandbox…</p>
          </div>
        )}

        {(status === "ready" || status === "running") && session && (
          <iframe
            key={session.sandboxId}
            src={session.streamUrl}
            title="Live desktop"
            className="h-full w-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms"
            allow="clipboard-read; clipboard-write"
          />
        )}

        {status === "error" && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-xs text-destructive-foreground">{error}</p>
            <button
              onClick={launch}
              className="mt-3 rounded-full border border-border/60 px-4 py-1.5 text-xs hover:bg-surface"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Steps timeline */}
      {(steps.length > 0 || summary || activeGoal) && (
        <div className="max-h-[40%] shrink-0 overflow-y-auto scrollbar-thin border-t border-border/60 bg-background/40 p-3">
          {activeGoal && (
            <p className="mb-2 text-[11px] text-muted-foreground">
              <span className="uppercase tracking-wider">Goal</span> · {activeGoal}
            </p>
          )}
          <ol className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.index} className="flex gap-2 text-[12px] leading-snug">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
                  {s.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground/90">{s.thought}</p>
                  {s.action && (
                    <p className="text-[10px] text-muted-foreground">
                      {actionLabel(s.action)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
          {summary && (
            <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-[12px] text-foreground">
              <p className="text-[10px] uppercase tracking-wider text-primary/80">Kite finished</p>
              <p className="mt-0.5">{summary}</p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function statusLabel(s: Status): string {
  switch (s) {
    case "idle":
      return "Not started";
    case "starting":
      return "Booting…";
    case "ready":
      return "Ready";
    case "running":
      return "Working";
    case "error":
      return "Error";
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function actionLabel(a: KiteStep["action"]): string {
  if (!a) return "";
  switch (a.type) {
    case "navigate":
      return `→ navigate ${a.url}`;
    case "left_click":
    case "right_click":
    case "double_click":
    case "move":
      return `→ ${a.type.replace("_", " ")} (${a.x}, ${a.y})`;
    case "scroll":
      return `→ scroll ${a.direction} ${a.amount}`;
    case "type":
      return `→ type "${truncate(a.text, 40)}"`;
    case "key":
      return `→ key ${a.key}`;
    case "wait":
      return `→ wait ${a.ms}ms`;
  }
}

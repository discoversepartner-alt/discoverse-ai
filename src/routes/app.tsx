import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { runOrchestrator, type AgentStep } from "@/server/orchestrator.functions";
import { AgentTimeline } from "@/components/agent-timeline";
import { AGENTS, AGENT_BY_ID, type AgentId } from "@/lib/agents";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Workspace — Discoverse AI" },
      { name: "description", content: "Your autonomous agent workspace. Type a goal, watch them go." },
    ],
  }),
  component: WorkspacePage,
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  plan?: AgentStep[];
  primaryAgent?: AgentId;
  pending?: boolean;
}

const SUGGESTIONS = [
  { agent: "researcher" as AgentId, label: "Research the EV market in India for 2026" },
  { agent: "writer" as AgentId, label: "Write a launch post for my startup" },
  { agent: "designer" as AgentId, label: "Make a 5-slide pitch deck outline" },
  { agent: "coder" as AgentId, label: "Build a Python script to summarise a CSV" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function WorkspacePage() {
  const orchestrate = useServerFn(runOrchestrator);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function autosize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
    const placeholder: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      pending: true,
      plan: [
        { agent: "orchestrator", title: "Orion is thinking…", detail: "Reading your goal", status: "running" },
      ],
    };

    const history = [...messages, userMsg];
    setMessages([...history, placeholder]);
    setInput("");
    setSending(true);
    requestAnimationFrame(autosize);

    try {
      const result = await orchestrate({
        data: {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        },
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === placeholder.id
            ? {
                ...m,
                pending: false,
                content: result.reply,
                plan: result.plan,
                primaryAgent: result.primaryAgent,
              }
            : m,
        ),
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== placeholder.id));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-background noise">
      {/* Top bar */}
      <header className="glass shrink-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse-glow" />
              <span className="relative h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="font-display text-base">Discoverse</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              New task
            </button>
            <Link
              to="/auth"
              className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-foreground hover:bg-surface"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6">
          {messages.length === 0 ? (
            <Welcome onPick={(s) => send(s)} />
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} content={m.content} />
              ) : (
                <AssistantBubble key={m.id} message={m} />
              ),
            )
          )}

          {error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border/50 bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-3 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:px-6 sm:py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2 rounded-3xl border border-border/60 bg-surface/80 p-2 pl-4 backdrop-blur transition-all focus-within:border-primary/50 focus-within:glow-amber"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Give the team a goal…"
              disabled={sending}
              className="flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed glow-amber"
            >
              {sending ? (
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary-foreground" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              )}
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Discoverse can make mistakes. Verify before shipping.
          </p>
        </div>
      </div>
    </div>
  );
}

function Welcome({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/30 blur-2xl" />
        <span className="relative h-3 w-3 rounded-full bg-primary glow-amber" />
      </div>
      <h2 className="mt-7 font-display text-3xl sm:text-4xl">What should we get done?</h2>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground sm:text-base">
        Type any goal. Orion will route it to the right agents and deliver the work.
      </p>

      <div className="mt-8 grid w-full max-w-md grid-cols-1 gap-2">
        {SUGGESTIONS.map((s) => {
          const a = AGENT_BY_ID[s.agent];
          return (
            <button
              key={s.label}
              onClick={() => onPick(s.label)}
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-surface/60 px-4 py-3 text-left text-sm text-foreground backdrop-blur transition-all hover:border-primary/40 hover:bg-surface-elevated/80"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/70 text-primary" aria-hidden>
                {a.icon}
              </span>
              <span className="flex-1">{s.label}</span>
              <span className="text-muted-foreground transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
        {AGENTS.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/40 px-2.5 py-1 text-[11px] text-muted-foreground"
          >
            <span className="text-primary" aria-hidden>{a.icon}</span>
            {a.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end animate-fade-up">
      <div className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-snug text-primary-foreground shadow-soft">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ message }: { message: ChatMessage }) {
  const primary = message.primaryAgent ? AGENT_BY_ID[message.primaryAgent] : AGENT_BY_ID.orchestrator;
  return (
    <div className="flex animate-fade-up gap-3">
      <div className="relative mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/70 text-base text-primary">
        <span className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
        <span className="relative" aria-hidden>{primary.icon}</span>
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {message.plan && message.plan.length > 0 && (
          <div className="rounded-3xl rounded-tl-md border border-border/60 bg-surface/60 p-4 backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-primary" />
              Agent plan
            </div>
            <AgentTimeline steps={message.plan} />
          </div>
        )}

        {!message.pending && message.content && (
          <div className="rounded-3xl rounded-tl-md border border-border/60 bg-surface-elevated/80 px-4 py-3 backdrop-blur">
            <p className="text-[11px] uppercase tracking-wider text-primary/80">{primary.name}</p>
            <div className="mt-1.5 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
              {message.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

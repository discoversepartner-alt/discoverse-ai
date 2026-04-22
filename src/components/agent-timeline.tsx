import { AGENT_BY_ID } from "@/lib/agents";
import type { AgentStep } from "@/server/orchestrator.functions";

export function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  return (
    <ol className="mt-3 space-y-2.5">
      {steps.map((step, i) => {
        const agent = AGENT_BY_ID[step.agent];
        const isRunning = step.status === "running";
        return (
          <li key={i} className="flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/70 text-[12px] text-primary">
              {isRunning && (
                <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />
              )}
              <span className="relative" aria-hidden>{agent.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] uppercase tracking-wider text-primary/80">{agent.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {isRunning ? "working" : "done"}
                </span>
              </div>
              <p className="text-sm leading-snug text-foreground">{step.title}</p>
              {step.detail && (
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{step.detail}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

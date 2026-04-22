import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AGENTS } from "@/lib/agents";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Agents — Discoverse AI" },
      {
        name: "description",
        content:
          "Meet the six autonomous agents inside Discoverse AI: Orion the orchestrator, Vega the researcher, Lyra the writer, Atlas the engineer, Kite the browser pilot, and Iris the designer.",
      },
      { property: "og:title", content: "Agents — Discoverse AI" },
      { property: "og:description", content: "Six specialists. One conductor. Meet the team." },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  return (
    <div className="min-h-screen flex flex-col noise">
      <SiteHeader />

      <section className="mx-auto w-full max-w-4xl px-5 pt-16 pb-12 sm:px-8 sm:pt-24">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/80">The agents</p>
        <h1 className="mt-3 text-balance font-display text-5xl leading-[1.05] sm:text-7xl">
          A small team,<br />
          <span className="text-amber-gradient italic">deeply autonomous.</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Each agent is a specialist with their own tools and judgment. Orion routes your goal to whoever can do it best — or all of them at once.
        </p>
      </section>

      <section className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        <div className="space-y-3">
          {AGENTS.map((agent) => (
            <article
              key={agent.id}
              className="group rounded-3xl border border-border/60 bg-surface/60 p-6 backdrop-blur transition-all hover:border-primary/40 sm:p-8"
            >
              <div className="flex items-start gap-5">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/60 text-2xl text-primary">
                  <span className="absolute inset-0 rounded-2xl bg-primary/10 blur-md opacity-0 transition-opacity group-hover:opacity-100" />
                  <span className="relative" aria-hidden>{agent.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-2xl sm:text-3xl">{agent.name}</h2>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">{agent.role}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{agent.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {agent.capabilities.map((c) => (
                      <span key={c} className="rounded-full bg-accent/60 px-2.5 py-1 text-[11px] text-accent-foreground">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/app"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-amber"
          >
            Put them to work
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

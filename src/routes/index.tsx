import { createFileRoute, Link } from "@tanstack/react-router";
import heroOrb from "@/assets/hero-orb.jpg";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AGENTS } from "@/lib/agents";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Discoverse AI — Your autonomous agent team" },
      {
        name: "description",
        content:
          "Discoverse AI is an autonomous multi-agent system that researches, writes, codes, designs, browses and ships on your behalf — built mobile-first.",
      },
      { property: "og:title", content: "Discoverse AI — Your autonomous agent team" },
      {
        property: "og:description",
        content: "An autonomous multi-agent system. Research, write, code, design, browse and ship — from your phone.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen flex flex-col noise">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <img
          src={heroOrb}
          alt=""
          aria-hidden="true"
          width={1280}
          height={1280}
          className="pointer-events-none absolute left-1/2 top-[-10%] -z-10 w-[120vw] max-w-[1400px] -translate-x-1/2 opacity-70 sm:opacity-90"
        />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-background" />

        <div className="mx-auto max-w-5xl px-5 pt-16 pb-20 text-center sm:px-8 sm:pt-28 sm:pb-32">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            Multi-agent system · in private beta
          </div>

          <h1 className="animate-fade-up mt-7 text-balance text-5xl leading-[1.05] tracking-tight sm:text-7xl md:text-8xl" style={{ animationDelay: "60ms" }}>
            <span className="text-gradient">A team of agents.</span>
            <br />
            <span className="font-display italic text-amber-gradient">One quiet mind.</span>
          </h1>

          <p className="animate-fade-up mx-auto mt-7 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:mt-9 sm:text-lg" style={{ animationDelay: "120ms" }}>
            Discoverse AI is an autonomous multi-agent system that researches, writes, codes, designs, browses and ships — so you can focus on what matters.
          </p>

          <div className="animate-fade-up mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4" style={{ animationDelay: "180ms" }}>
            <Link
              to="/app"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 sm:w-auto glow-amber"
            >
              Start a task
              <span aria-hidden>→</span>
            </Link>
            <Link
              to="/agents"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-surface/40 px-7 py-3.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface sm:w-auto"
            >
              Meet the agents
            </Link>
          </div>

          <p className="animate-fade-up mt-6 text-xs text-muted-foreground sm:text-sm" style={{ animationDelay: "240ms" }}>
            Mobile-first · Built for autonomy · Inspired by Manus, made warmer
          </p>
        </div>
      </section>

      {/* Agents grid */}
      <section className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary/80">The team</p>
            <h2 className="mt-2 font-display text-3xl sm:text-5xl">
              Six specialists.<br className="sm:hidden" />
              <span className="text-muted-foreground"> One conductor.</span>
            </h2>
          </div>
          <Link to="/agents" className="hidden text-sm text-muted-foreground hover:text-foreground sm:block">
            See all →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent, i) => (
            <article
              key={agent.id}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-surface/60 p-6 backdrop-blur transition-all hover:border-primary/40 hover:bg-surface-elevated/80"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-100 opacity-0" />
              <div className="flex items-start justify-between">
                <span className="text-2xl text-primary" aria-hidden>{agent.icon}</span>
                <span className="rounded-full border border-border/70 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {agent.role}
                </span>
              </div>
              <h3 className="mt-5 font-display text-2xl">{agent.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{agent.description}</p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {agent.capabilities.map((c) => (
                  <span key={c} className="rounded-full bg-accent/60 px-2.5 py-1 text-[11px] text-accent-foreground">
                    {c}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Manifesto strip */}
      <section className="mx-auto mt-32 w-full max-w-4xl px-5 text-center sm:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Manifesto</p>
        <p className="mt-5 text-balance font-display text-3xl leading-snug sm:text-5xl">
          We believe the next great interface is <em className="text-amber-gradient not-italic">no interface</em> — just intent, and a team that gets it done.
        </p>
        <Link to="/manifesto" className="mt-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          Read the full manifesto →
        </Link>
      </section>

      {/* Final CTA */}
      <section className="mx-auto mt-32 w-full max-w-3xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-surface-elevated to-surface p-8 text-center sm:p-14">
          <div className="absolute inset-0 -z-10 opacity-40" style={{ backgroundImage: "var(--gradient-glow)" }} />
          <h2 className="font-display text-3xl sm:text-5xl">Give them something to do.</h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            Open the workspace. Type a goal. Watch your agents go to work.
          </p>
          <Link
            to="/app"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 glow-amber"
          >
            Open Discoverse
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

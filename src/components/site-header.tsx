import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5 group">
          <span className="relative flex h-7 w-7 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse-glow" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-primary glow-amber" />
          </span>
          <span className="font-display text-lg tracking-tight text-foreground">
            Discoverse<span className="text-primary"> AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground sm:flex">
          <Link to="/agents" className="transition-colors hover:text-foreground">Agents</Link>
          <Link to="/manifesto" className="transition-colors hover:text-foreground">Manifesto</Link>
          <Link to="/app" className="transition-colors hover:text-foreground">Workspace</Link>
        </nav>

        <Link
          to="/app"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-all hover:opacity-90 sm:text-sm sm:px-5 sm:py-2.5 glow-amber"
        >
          Launch
          <span aria-hidden>→</span>
        </Link>
      </div>
    </header>
  );
}

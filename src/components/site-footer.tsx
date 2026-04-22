import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 mt-32">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
              <span className="font-display text-lg">Discoverse AI</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              An autonomous multi-agent system. Quietly working in the background, so you can think about bigger things.
            </p>
          </div>

          <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <Link to="/agents" className="hover:text-foreground">Agents</Link>
            <Link to="/manifesto" className="hover:text-foreground">Manifesto</Link>
            <Link to="/app" className="hover:text-foreground">Workspace</Link>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/50 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Discoverse AI. All rights reserved.</span>
          <span className="font-display italic">Built for the autonomous era.</span>
        </div>
      </div>
    </footer>
  );
}

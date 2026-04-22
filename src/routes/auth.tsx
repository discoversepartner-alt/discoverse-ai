import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Discoverse AI" },
      { name: "description", content: "Sign in to your Discoverse AI workspace." },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) navigate({ to: "/app" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate({ to: "/app" });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        const redirect = typeof window !== "undefined" ? window.location.origin + "/app" : undefined;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) throw error;
        setMessage("Check your inbox to confirm your email.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    const redirect = typeof window !== "undefined" ? window.location.origin + "/app" : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-5 py-10 noise">
      <Link to="/" className="mb-10 flex items-center gap-2.5">
        <span className="relative flex h-7 w-7 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse-glow" />
          <span className="relative h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <span className="font-display text-lg">Discoverse <span className="text-primary">AI</span></span>
      </Link>

      <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-surface/70 p-6 backdrop-blur sm:p-8">
        <h1 className="font-display text-3xl">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to your workspace." : "Start delegating to your agents."}
        </p>

        <button
          onClick={handleGoogle}
          className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-border/70 bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated"
        >
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.1l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.1z"/><path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.3l-6.3-5.3C29.3 35 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.3C41.3 35.7 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border/60" />
          or
          <div className="h-px flex-1 bg-border/60" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@domain.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border/60 bg-input px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-border/60 bg-input px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50 glow-amber"
          >
            {loading ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && <p className="mt-4 text-sm text-primary">{message}</p>}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setMessage(null);
            }}
            className="font-medium text-foreground hover:text-primary"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>

      <Link to="/" className="mt-6 text-xs text-muted-foreground hover:text-foreground">
        ← Back home
      </Link>
    </div>
  );
}

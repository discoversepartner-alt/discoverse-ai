import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — Discoverse AI" },
      {
        name: "description",
        content:
          "Why Discoverse AI exists. A manifesto on autonomous software, mobile-first AI, and the disappearance of the interface.",
      },
      { property: "og:title", content: "Manifesto — Discoverse AI" },
      { property: "og:description", content: "On autonomy, intent, and the disappearance of the interface." },
    ],
  }),
  component: ManifestoPage,
});

function ManifestoPage() {
  return (
    <div className="min-h-screen flex flex-col noise">
      <SiteHeader />

      <article className="mx-auto w-full max-w-2xl px-5 pt-16 pb-12 sm:px-8 sm:pt-24">
        <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Manifesto</p>
        <h1 className="mt-3 text-balance font-display text-5xl leading-[1.05] sm:text-7xl">
          On <span className="italic text-amber-gradient">autonomy</span>.
        </h1>

        <div className="mt-12 space-y-6 text-base leading-[1.85] text-muted-foreground sm:text-lg">
          <p>
            For sixty years software has asked us to <em>do</em> things — to click, to type, to wait, to click again. We taught ourselves the language of menus and modals. We grew used to it.
          </p>
          <p className="text-foreground">
            We don't think that's how it has to be.
          </p>
          <p>
            Discoverse AI is built on a simple bet: the best interface is the one you don't notice. You say what you want. A team of agents quietly figures out the rest. They research. They write. They run code. They open browsers. They ship the work back to you, finished.
          </p>
          <p>
            We start on the phone, because that's where most of the world meets the internet. Not the laptop. Not the IDE. The phone. So everything we make has to feel native to a thumb at 11pm on a couch.
          </p>
          <p>
            We choose <em>warm</em> over cold, <em>quiet</em> over loud, <em>autonomous</em> over assistive. The model isn't a chatbot. It's a small org chart that lives in your pocket.
          </p>
          <p className="text-foreground">
            We're building Discoverse AI for the people who'd rather think about the goal than the tool.
          </p>
          <p className="font-display italic text-foreground">
            — The Discoverse team
          </p>
        </div>

        <div className="mt-14">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 glow-amber"
          >
            Try it now
            <span aria-hidden>→</span>
          </Link>
        </div>
      </article>

      <SiteFooter />
    </div>
  );
}

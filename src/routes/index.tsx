import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Box, Flame, Scissors, Sparkles } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/shop";
import { ProductCard } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NovaFix Tech Lab — Personalizados em Impressão 3D e Laser" },
      { name: "description", content: "Figuras 3D, chaveiros, luminárias, cortadores de biscoito e presentes personalizados, feitos à medida com impressão 3D e laser." },
      { property: "og:title", content: "NovaFix Tech Lab — Personalizados em 3D e Laser" },
      { property: "og:description", content: "Artigos únicos feitos à medida com impressão 3D, gravação e corte a laser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(productsQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  component: Home,
  errorComponent: ({ error }) => <p className="p-10 text-center text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
});

function Home() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const highlights = [...products].sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.ribbons.includes("Best Seller")) - Number(a.ribbons.includes("Best Seller"))).slice(0, 8);
  const heroImgs = products.filter((p) => p.image).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-neon-violet/25 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Feito à medida, peça a peça
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Ideias que ganham forma em <span className="text-neon">3D e laser</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Figuras, chaveiros, luminárias, cortadores de biscoito e presentes personalizados. Escolha o modelo, a cor e o tamanho — nós fabricamos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/produtos" className="inline-flex items-center gap-2 rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon transition-transform hover:scale-[1.02]">
                Ver a loja <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/sobre" className="inline-flex items-center rounded-lg border border-border px-6 py-3 font-semibold hover:border-primary/60">
                Como trabalhamos
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {heroImgs.map((p, i) => (
              <Link key={p.id} to="/produto/$slug" params={{ slug: p.slug }} className={`overflow-hidden rounded-2xl border border-border shadow-neon ${i % 2 ? "translate-y-8" : ""}`}>
                <img src={p.image!} alt={p.name} className="aspect-square w-full object-cover transition-transform duration-500 hover:scale-105" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Box, t: "Impressão 3D", d: "Figuras, suportes e peças com detalhe e resistência." },
            { icon: Flame, t: "Gravação laser", d: "Nomes, logótipos e mensagens gravados com precisão." },
            { icon: Scissors, t: "Corte laser", d: "Formas exatas em madeira e acrílico para decoração." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card p-6">
              <Icon className="h-6 w-6 text-primary" />
              <p className="mt-4 font-display font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Categorias</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} to="/produtos" search={{ categoria: c.slug }} className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-primary/60 hover:text-primary">
              {c.name} <span className="text-muted-foreground">({c.count})</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Em destaque</h2>
          <Link to="/produtos" className="text-sm text-primary hover:underline">Ver todos →</Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {highlights.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>
    </>
  );
}

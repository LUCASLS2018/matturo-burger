import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { categoriesQuery, productsQuery } from "@/lib/shop";
import { ProductCard } from "@/components/shop/ProductCard";

type SearchParams = { q?: string | undefined; categoria?: string | undefined; ordem?: "recentes" | "preco-asc" | "preco-desc" | undefined };

export const Route = createFileRoute("/produtos")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    categoria: typeof s.categoria === "string" && s.categoria ? s.categoria : undefined,
    ordem: s.ordem === "preco-asc" || s.ordem === "preco-desc" ? s.ordem : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Loja — NovaFix Tech Lab" },
      { name: "description", content: "Todos os produtos personalizados NovaFix: figuras 3D, chaveiros, luminárias, cortadores de biscoito e muito mais." },
      { property: "og:title", content: "Loja NovaFix Tech Lab" },
      { property: "og:description", content: "Explore os produtos personalizados em impressão 3D e laser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(productsQuery), context.queryClient.ensureQueryData(categoriesQuery)]),
  component: Catalog,
  errorComponent: ({ error }) => <p className="p-10 text-center text-destructive">{error.message}</p>,
});

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function Catalog() {
  const { q, categoria, ordem } = Route.useSearch();
  const navigate = useNavigate({ from: "/produtos" });
  const { data: products } = useSuspenseQuery(productsQuery);
  const { data: categories } = useSuspenseQuery(categoriesQuery);
  const cat = categories.find((c) => c.slug === categoria);

  let list = products;
  if (cat) list = list.filter((p) => p.categoryIds.includes(cat.id));
  if (q) list = list.filter((p) => norm(p.name + " " + p.shortDescription).includes(norm(q)));
  if (ordem === "preco-asc") list = [...list].sort((a, b) => a.minPrice - b.minPrice);
  if (ordem === "preco-desc") list = [...list].sort((a, b) => b.minPrice - a.minPrice);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{cat ? cat.name : "Todos os produtos"}</h1>
      <p className="mt-2 text-muted-foreground">{list.length} {list.length === 1 ? "produto" : "produtos"}</p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            defaultValue={q ?? ""}
            onChange={(e) => navigate({ search: (prev) => ({ ...prev, q: e.target.value || undefined }), replace: true })}
            placeholder="Pesquisar produtos…"
            className="h-11 w-full rounded-lg border border-input bg-card pl-10 pr-3 outline-none focus:border-primary"
          />
        </label>
        <select
          value={ordem ?? "recentes"}
          onChange={(e) => navigate({ search: (prev) => ({ ...prev, ordem: e.target.value === "recentes" ? undefined : (e.target.value as SearchParams["ordem"]) }) })}
          className="h-11 rounded-lg border border-input bg-card px-3 outline-none focus:border-primary"
          aria-label="Ordenar"
        >
          <option value="recentes">Mais recentes</option>
          <option value="preco-asc">Preço: menor primeiro</option>
          <option value="preco-desc">Preço: maior primeiro</option>
        </select>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <Link to="/produtos" search={(p) => ({ ...p, categoria: undefined })} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${!cat ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/60"}`}>
          Todas
        </Link>
        {categories.map((c) => (
          <Link key={c.id} to="/produtos" search={(p) => ({ ...p, categoria: c.slug })} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${cat?.id === c.id ? "border-primary bg-primary/15 text-primary" : "border-border hover:border-primary/60"}`}>
            {c.name}
          </Link>
        ))}
      </div>

      {list.length ? (
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {list.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      ) : (
        <p className="mt-16 text-center text-muted-foreground">Nenhum produto encontrado.</p>
      )}
    </div>
  );
}

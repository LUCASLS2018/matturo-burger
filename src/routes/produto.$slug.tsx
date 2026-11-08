import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { cleanText, formatPrice, productQuery } from "@/lib/shop";
import { useCart } from "@/lib/cart";
import { RibbonBadge } from "@/components/shop/ProductCard";

export const Route = createFileRoute("/produto/$slug")({
  loader: async ({ context, params }) => {
    const p = await context.queryClient.ensureQueryData(productQuery(params.slug));
    if (!p) throw notFound();
    return p;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Produto indisponível — NovaFix Tech Lab" }, { name: "robots", content: "noindex" }] };
    const desc = cleanText(loaderData.shortDescription || loaderData.description).slice(0, 155);
    const img = loaderData.images[0]?.url;
    return {
      meta: [
        { title: `${loaderData.name} — NovaFix Tech Lab` },
        { name: "description", content: desc },
        { property: "og:title", content: loaderData.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(img ? [{ property: "og:image", content: img }, { name: "twitter:image", content: img }] : []),
      ],
    };
  },
  component: ProductPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Produto não encontrado</h1>
      <Link to="/produtos" className="mt-4 inline-block text-primary hover:underline">Voltar à loja</Link>
    </div>
  ),
  errorComponent: ({ error }) => <p className="p-10 text-center text-destructive">{error instanceof Error ? error.message : String(error)}</p>,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(productQuery(slug));
  const p = data!;
  const cart = useCart();
  const [imgIdx, setImgIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [sel, setSel] = useState<Record<string, string>>({});

  const hasVariations = p.variations.length > 0;
  const allChosen = p.optionGroups.every((g) => sel[g.name]);
  const variation = useMemo(
    () => (hasVariations && allChosen ? p.variations.find((v) => p.optionGroups.every((g) => v.options[g.name] === sel[g.name])) : undefined),
    [sel, p, hasVariations, allChosen],
  );

  // Which values are still possible given the other selections
  const isAvailable = (group: string, value: string) => {
    if (!hasVariations) return true;
    return p.variations.some((v) => v.options[group] === value && Object.entries(sel).every(([k, s]) => k === group || v.options[k] === s));
  };

  const price = variation?.price ?? (p.minPrice === p.maxPrice ? p.minPrice : null);
  const regular = variation ? variation.regularPrice : p.regularPrice;
  const showOld = price !== null && regular && regular > price;
  const combinationMissing = hasVariations && allChosen && !variation;
  const canAdd = allChosen && !combinationMissing && price !== null;

  const add = () => {
    if (!canAdd || price === null) return;
    cart.add({ productId: p.id, slug: p.slug, name: p.name, image: p.images[0]?.url ?? null, price, options: sel }, qty);
    toast.success("Adicionado ao carrinho", { description: p.name, action: { label: "Ver carrinho", onClick: () => (window.location.href = "/carrinho") } });
  };

  const img = p.images[imgIdx] ?? p.images[0];
  const paragraphs = cleanText(p.description).split(/\n{2,}/).filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/produtos" className="hover:text-foreground">Loja</Link>
        {p.categories[0] && (
          <>
            {" / "}
            <Link to="/produtos" search={{ categoria: p.categories[0].slug }} className="hover:text-foreground">{p.categories[0].name}</Link>
          </>
        )}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
            {img && <img src={img.url} alt={img.alt} className="aspect-square w-full object-cover" />}
            <div className="absolute left-4 top-4 flex flex-wrap gap-1.5">{p.ribbons.map((r) => <RibbonBadge key={r} name={r} />)}</div>
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {p.images.map((im, i) => (
                <button key={im.url} onClick={() => setImgIdx(i)} aria-label={`Imagem ${i + 1}`} className={`overflow-hidden rounded-lg border-2 ${i === imgIdx ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"}`}>
                  <img src={im.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">{p.name}</h1>
          <div className="mt-4 flex items-baseline gap-3 text-2xl text-primary">
            {price !== null ? <span className="font-bold">{formatPrice(price)}</span> : <span className="font-bold">{formatPrice(p.minPrice)} – {formatPrice(p.maxPrice)}</span>}
            {showOld && <span className="text-base text-muted-foreground line-through">{formatPrice(regular!)}</span>}
          </div>
          {p.shortDescription && <p className="mt-4 text-muted-foreground">{cleanText(p.shortDescription)}</p>}

          <div className="mt-8 space-y-6">
            {p.optionGroups.map((g) => (
              <div key={g.name}>
                <p className="mb-2 text-sm font-semibold">
                  {g.name === "TIME" ? "Time" : g.name}
                  {sel[g.name] && <span className="font-normal text-muted-foreground">: {sel[g.name]}</span>}
                </p>
                <div className="flex flex-wrap gap-2">
                  {g.values.map((v) => {
                    const active = sel[g.name] === v;
                    const ok = isAvailable(g.name, v);
                    return (
                      <button
                        key={v}
                        onClick={() => setSel((s) => (active ? Object.fromEntries(Object.entries(s).filter(([k]) => k !== g.name)) : { ...s, [g.name]: v }))}
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${active ? "border-primary bg-primary/15 text-primary" : ok ? "border-border hover:border-primary/60" : "border-border text-muted-foreground line-through opacity-50"}`}
                      >
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {combinationMissing && <p className="mt-4 text-sm text-destructive">Esta combinação não está disponível.</p>}

          <div className="mt-8 flex gap-3">
            <div className="flex items-center rounded-lg border border-border">
              <button aria-label="Menos" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-12 w-11 place-items-center"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center font-semibold">{qty}</span>
              <button aria-label="Mais" onClick={() => setQty((q) => q + 1)} className="grid h-12 w-11 place-items-center"><Plus className="h-4 w-4" /></button>
            </div>
            <button
              onClick={add}
              disabled={!canAdd}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-neon px-6 font-semibold text-primary-foreground shadow-neon transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShoppingBag className="h-5 w-5" />
              {allChosen ? "Adicionar ao carrinho" : "Escolha as opções"}
            </button>
          </div>

          {paragraphs.length > 0 && (
            <div className="mt-10 space-y-4 border-t border-border pt-8 text-sm leading-relaxed text-muted-foreground">
              {paragraphs.map((t, i) => <p key={i} className="whitespace-pre-line">{t}</p>)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/shop";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — NovaFix Tech Lab" },
      { name: "description", content: "Reveja os produtos personalizados que escolheu." },
      { property: "og:title", content: "Carrinho — NovaFix Tech Lab" },
      { property: "og:description", content: "Os seus produtos personalizados NovaFix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, setQty, remove } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">O seu carrinho está vazio</h1>
        <p className="mt-2 text-muted-foreground">Explore a loja e escolha os seus personalizados.</p>
        <Link to="/produtos" className="mt-6 inline-flex rounded-lg bg-neon px-6 py-3 font-semibold text-primary-foreground shadow-neon">Ir para a loja</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Carrinho</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((i) => (
            <li key={i.key} className="flex gap-4 p-4">
              <Link to="/produto/$slug" params={{ slug: i.slug }} className="shrink-0">
                {i.image && <img src={i.image} alt={i.name} className="h-20 w-20 rounded-lg object-cover sm:h-24 sm:w-24" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link to="/produto/$slug" params={{ slug: i.slug }} className="font-medium hover:text-primary">{i.name}</Link>
                {Object.entries(i.options).length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">{Object.entries(i.options).map(([k, v]) => `${k === "TIME" ? "Time" : k}: ${v}`).join(" · ")}</p>
                )}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-border">
                    <button aria-label="Menos" onClick={() => setQty(i.key, i.qty - 1)} className="grid h-9 w-9 place-items-center"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-7 text-center text-sm font-semibold">{i.qty}</span>
                    <button aria-label="Mais" onClick={() => setQty(i.key, i.qty + 1)} className="grid h-9 w-9 place-items-center"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(i.price * i.qty)}</span>
                    <button aria-label="Remover" onClick={() => remove(i.key)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-xl border border-border bg-card p-6">
          <div className="flex justify-between text-lg font-semibold">
            <span>Subtotal</span>
            <span className="text-primary">{formatPrice(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Portes e pagamento serão combinados na finalização.</p>
          <button disabled className="mt-6 w-full cursor-not-allowed rounded-lg bg-neon py-3 font-semibold text-primary-foreground opacity-50">
            Finalizar encomenda (em breve)
          </button>
          <Link to="/produtos" className="mt-3 block text-center text-sm text-primary hover:underline">Continuar a comprar</Link>
        </aside>
      </div>
    </div>
  );
}

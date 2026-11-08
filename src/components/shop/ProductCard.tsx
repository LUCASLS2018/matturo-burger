import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { formatPrice, type ProductCardDTO } from "@/lib/shop";

const ribbonStyle: Record<string, string> = {
  "Promoção": "bg-destructive text-destructive-foreground",
  "Novidade": "bg-primary text-primary-foreground",
  "Best Seller": "bg-accent text-accent-foreground",
  "Sob Encomenda": "bg-secondary text-secondary-foreground border border-border",
};

export function RibbonBadge({ name }: { name: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${ribbonStyle[name] ?? "bg-secondary text-secondary-foreground"}`}>
      {name}
    </span>
  );
}

export function PriceTag({ p }: { p: ProductCardDTO }) {
  if (p.minPrice !== p.maxPrice) {
    return <span className="font-semibold">A partir de {formatPrice(p.minPrice)}</span>;
  }
  const showOld = p.onSale && p.regularPrice && p.regularPrice > p.minPrice;
  return (
    <span className="flex items-baseline gap-2">
      <span className="font-semibold">{formatPrice(p.minPrice)}</span>
      {showOld && <span className="text-sm text-muted-foreground line-through">{formatPrice(p.regularPrice!)}</span>}
    </span>
  );
}

export function ProductCard({ p }: { p: ProductCardDTO }) {
  return (
    <Link
      to="/produto/$slug"
      params={{ slug: p.slug }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/50 hover:shadow-neon"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {p.image ? (
          <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageOff /></div>
        )}
        {p.ribbons.length > 0 && (
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {p.ribbons.map((r) => <RibbonBadge key={r} name={r} />)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display font-medium leading-snug">{p.name}</h3>
        <div className="mt-auto text-primary"><PriceTag p={p} /></div>
      </div>
    </Link>
  );
}

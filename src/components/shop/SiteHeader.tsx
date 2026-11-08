import { Link } from "@tanstack/react-router";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";

const nav = [
  { to: "/", label: "Início" },
  { to: "/produtos", label: "Loja" },
  { to: "/sobre", label: "Como trabalhamos" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-neon text-primary-foreground shadow-neon">N</span>
          <span>
            NovaFix <span className="text-neon">Tech Lab</span>
          </span>
        </Link>
        <nav className="ml-6 hidden gap-1 md:flex">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.to === "/" }}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/carrinho" aria-label="Carrinho" className="relative grid h-10 w-10 place-items-center rounded-lg border border-border hover:border-primary/60">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
          <button aria-label="Menu" onClick={() => setOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-lg border border-border md:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border px-4 py-3 md:hidden">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-base hover:bg-secondary">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold">
            NovaFix <span className="text-neon">Tech Lab</span>
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Artigos personalizados feitos à medida com impressão 3D, gravação e corte a laser.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Loja</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li><Link to="/produtos" className="hover:text-foreground">Todos os produtos</Link></li>
            <li><Link to="/carrinho" className="hover:text-foreground">Carrinho</Link></li>
            <li><Link to="/sobre" className="hover:text-foreground">Como trabalhamos</Link></li>
          </ul>
        </div>
        <div className="text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Tecnologias</p>
          <p className="mt-3">Impressão 3D · Gravação laser · Corte laser</p>
          <p className="mt-6 text-xs">© {new Date().getFullYear()} NovaFix Tech Lab</p>
        </div>
      </div>
    </footer>
  );
}

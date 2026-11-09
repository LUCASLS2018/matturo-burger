import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, ShoppingBag, X, Instagram, MapPin } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { restaurant } from "@/lib/restaurant";
import logo from "@/assets/matturo/logo-black.png";
import {CustomerAccountAccess} from "./CustomerAccountAccess";
import {OpeningStatus} from "./OpeningStatus";

export function RestaurantHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-lg">
    <div className="page-width flex h-16 items-center justify-between gap-4 sm:h-24">
      <Link to="/" aria-label="Matturo Burger — início" className="shrink-0"><img src={logo} alt="Matturo Burger" className="h-12 w-36 object-contain sm:h-20 sm:w-52 lg:w-64" /></Link>
      <nav aria-label="Navegação principal" className="hidden items-center gap-6 text-sm font-medium lg:flex">
        <Link to="/" activeProps={{ className: "text-primary" }} activeOptions={{ exact: true }}>Início</Link>
        <Link to="/cardapio" activeProps={{ className: "text-primary" }}>Cardápio</Link>
        <Link to="/sobre" activeProps={{ className: "text-primary" }}>O Matturo</Link>
        <Link to="/atendimento" activeProps={{ className: "text-primary" }}>Atendimento</Link>
        <Link to="/contactos" activeProps={{ className: "text-primary" }}>Contactos</Link>
        <Link to="/pontos" activeProps={{ className: "text-primary" }}>Os meus pontos</Link>
      </nav>
      <div className="flex items-center gap-3">
        <CustomerAccountAccess/>
        <Button asChild variant="ghost" className="relative" aria-label={`Ver pedido, ${count} artigos`}><Link to="/carrinho"><ShoppingBag />{count > 0 && <span className="text-xs font-semibold">{count}</span>}</Link></Button>
        <Button asChild className="hidden h-11 sm:inline-flex"><Link to={restaurant.orderUrl}>Pedir agora <ArrowUpRight /></Link></Button>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</Button>
      </div>
    </div>
    {open && <nav aria-label="Menu móvel" className="flex flex-col gap-5 border-t border-border px-6 py-6 lg:hidden" onClick={() => setOpen(false)}><Link to="/">Início</Link><Link to="/cardapio">Cardápio</Link><Link to="/sobre">O Matturo</Link><Link to="/atendimento">Atendimento</Link><Link to="/contactos">Contactos</Link><Link to="/pontos">Os meus pontos</Link></nav>}
  </header>;
}

export function RestaurantFooter() {
  return <footer className="bg-hero-surface text-hero-foreground">
    <div className="page-width grid gap-10 py-14 md:grid-cols-[1.3fr_1fr_1fr]">
      <div><img src={logo} alt="Matturo Burger" className="h-28 w-72 max-w-full bg-background p-3 object-contain" /><p className="mt-4 max-w-xs text-sm leading-relaxed text-hero-foreground/70">Pizzas deliciosas e hambúrgueres incríveis, em Vila Franca de Xira.</p></div>
      <div><h2 className="mb-5 font-semibold">Venha até ao Matturo</h2><a href={restaurant.maps} target="_blank" rel="noopener noreferrer" className="flex gap-2 text-sm leading-relaxed text-hero-foreground/70"><MapPin className="h-5 w-5 shrink-0" />{restaurant.address}</a><a href={restaurant.whatsapp} className="mt-4 block text-sm text-hero-foreground/70">{restaurant.phone}</a></div>
      <div><h2 className="mb-5 font-semibold">À sua maneira</h2><div className="flex flex-col gap-3 text-sm text-hero-foreground/70"><Link to="/cardapio">Cardápio</Link><Link to="/atendimento">Retirada e delivery</Link><Link to="/contactos">Contactos e horários</Link></div><div className="mt-5 flex gap-4"><a href={restaurant.instagram} aria-label="Instagram" target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5" /></a><a href={restaurant.tiktok} target="_blank" rel="noopener noreferrer" className="text-sm">TikTok ↗</a></div></div>
    </div><div className="page-width border-t border-hero-foreground/15 py-6 text-xs text-hero-foreground/60">© Matturo Burger · Vila Franca de Xira</div>
  </footer>;
}
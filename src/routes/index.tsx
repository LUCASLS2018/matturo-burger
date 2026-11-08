import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, Bike, ShoppingBag, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DishCard } from "@/components/restaurant/Menu";
import { InstallAppButton } from "@/components/restaurant/InstallApp";

import { restaurant, restaurantHead } from "@/lib/restaurant";
import burgerCutout from "@/assets/matturo/hamburguer-triplo-overdose-cutout.png";
import { menuCategoriesQuery, menuQuery } from "@/lib/menu-query";
import { useSuspenseQuery } from "@tanstack/react-query";
export const Route = createFileRoute("/")({ head: () => restaurantHead("Hambúrgueres e pizzas em Vila Franca de Xira", restaurant.description), loader:({context})=>Promise.all([context.queryClient.ensureQueryData(menuQuery),context.queryClient.ensureQueryData(menuCategoriesQuery)]), component: Home });
function Home() {
 const { data: dishes } = useSuspenseQuery(menuQuery);
 const { data: categories } = useSuspenseQuery(menuCategoriesQuery);
 const hero = dishes.find(p => p.slug === "hamburguer-matturo");
 const orderedCategories = [...categories].sort((a,b) => Number(b.slug === "promocoes") - Number(a.slug === "promocoes"));
 return <><section className="matturo-hero relative flex items-center overflow-hidden bg-background text-foreground">
 {hero?.image && <img src={burgerCutout} alt="Hambúrguer Triplo Overdose — fotografia sem fundo" className="absolute inset-0 -z-10 h-full w-full object-cover object-right" />}
 <div className="page-width py-14"><div className="max-w-xl"><div className="mb-6 flex items-center gap-2 text-sm font-medium text-primary"><span className="h-px w-8 bg-primary" /> VILA FRANCA DE XIRA</div><h1 className="font-display text-5xl font-normal leading-[1.06] sm:text-7xl">MATTURO<br /><span>BURGER.</span></h1><p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">A combinação perfeita entre pizzas deliciosas e hambúrgueres incríveis está aqui para si.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild className="h-12 px-6"><Link to="/cardapio">Explorar o cardápio <ArrowRight /></Link></Button><Button asChild variant="ghost" className="h-12 border border-primary/40 px-6 text-primary hover:bg-primary/10 hover:text-primary"><Link to={restaurant.orderUrl}>Pedir agora <ArrowRight /></Link></Button><InstallAppButton /></div><div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground"><Star className="h-4 w-4 fill-primary text-primary" /> 4.9 no Google <span className="mx-2">·</span> Matturo Burger</div></div></div></section>
 <section className="border-b border-border bg-card"><div className="page-width grid grid-cols-1 divide-y divide-border py-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">{[{Icon:ShoppingBag,t:"Retirada",d:"O seu pedido, para levar"},{Icon:Bike,t:"Delivery",d:"O Matturo vai até si"},{Icon:MapPin,t:"Vila Franca de Xira",d:"Encontre-nos por aqui"}].map(({Icon,t,d})=><Link to="/atendimento" key={t} className="flex items-center justify-center gap-4 py-4"><Icon className="h-6 w-6 text-primary" /><div><p className="text-sm font-semibold">{t}</p><p className="mt-1 text-xs text-muted-foreground">{d}</p></div></Link>)}</div></section>
 <section className="page-width py-16"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="mb-3 text-xs font-semibold text-primary">UM CONVITE AO SABOR</p><h2 className="section-title">Hoje apetece-lhe…</h2></div><Button asChild variant="link"><Link to="/cardapio">Ver cardápio <ArrowRight /></Link></Button></div><div className="flex flex-wrap gap-3">{categories.map(c=><Button asChild key={c.id} variant="outline" className="h-12 px-6"><Link to="/cardapio">{c.name} <ArrowUpRight /></Link></Button>)}</div></section>
 {orderedCategories.map(category => <section key={category.id} className="page-width pb-16"><div className="mb-8 border-b border-border pb-5"><h2 className="section-title">{category.name}</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{dishes.filter(p => p.category === category.slug).map(p=><DishCard key={p.id} dish={p} />)}</div></section>)}
 <section className="border-t border-border bg-secondary"><div className="page-width flex flex-col justify-between gap-8 py-14 md:flex-row md:items-center"><div><h2 className="section-title">Seja bem-vindo ao Matturo.</h2><p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{restaurant.description}</p></div><Button asChild variant="outline" className="h-12"><Link to="/contactos">Venha conhecer-nos <ArrowUpRight /></Link></Button></div></section></>;
}

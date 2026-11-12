import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Utensils, Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Dish } from "@/lib/menu";
import { money } from "@/lib/restaurant";
import { dishCutout } from "@/lib/dish-images";
import { useSuspenseQuery } from "@tanstack/react-query";
import { menuCategoriesQuery, menuQuery } from "@/lib/menu-query";
import { publicSettingsQuery } from "@/lib/settings-query";
import { discountedPrice, effectiveDiscount } from "@/lib/site-discount";

export function DishCard({ dish }: { dish: Dish }) {
  const { data: settings } = useSuspenseQuery(publicSettingsQuery);
  const acceptingOrders = !settings.paused;
  const cutout = dishCutout(dish.slug);
  const customPhoto = dish.image?.startsWith("https://") ? dish.image : null;
  const photo = customPhoto || cutout || dish.image;
  return <article className="burger-card group">
    <div className="burger-card-panel" />
    <Link to="/produto/$slug" params={{ slug: dish.slug }} className="burger-card-photo" aria-label={dish.name}>{photo ? <img src={photo} alt={dish.name} loading="lazy" className={(customPhoto || cutout) ? "food-photo h-full w-full object-contain" : "food-photo mx-auto mt-4 aspect-square w-full rounded-full object-cover"} /> : <Utensils className="mx-auto mt-12 h-10 w-10 text-muted-foreground" />}</Link>
    <div className="burger-card-content">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button size="icon" variant="outline" className="h-7 w-7 rounded-md border-0 bg-primary/15 text-primary" title={`Diminuir quantidade de ${dish.name}`} aria-label={`Diminuir quantidade de ${dish.name}`} disabled><Minus className="h-3 w-3" /></Button>
        <span className="w-4 text-center text-xs font-semibold" aria-label={`Quantidade de ${dish.name}`}>0</span>
        {acceptingOrders && dish.available ? <Button asChild size="icon" className="h-7 w-7 rounded-md" title={`Adicionar ${dish.name}`}><Link to="/produto/$slug" params={{ slug: dish.slug }} search={{ quantidade: 1 }} aria-label={`Adicionar ${dish.name}`}><Plus className="h-3 w-3" /></Link></Button> : <Button size="icon" className="h-7 w-7 rounded-md" disabled title="Pedidos pausados" aria-label={`Adicionar ${dish.name}`}><Plus className="h-3 w-3" /></Button>}
        {acceptingOrders && dish.available ? <Button asChild size="icon" variant="outline" className="ml-1 h-9 w-9 border-0 bg-card text-primary" title={`Selecionar ${dish.name}`}><Link to="/produto/$slug" params={{ slug: dish.slug }} search={{ quantidade: 1 }} aria-label={`Selecionar ${dish.name}`}><ShoppingBasket className="h-4 w-4" /></Link></Button> : <Button size="icon" variant="outline" className="ml-1 h-9 w-9 border-0 bg-card text-primary" disabled title="Pedidos pausados" aria-label={`Selecionar ${dish.name}`}><ShoppingBasket className="h-4 w-4" /></Button>}
      </div>
      <Link to="/produto/$slug" params={{ slug: dish.slug }}><h3 className="min-h-10 break-words text-sm font-semibold leading-5">{dish.name}</h3></Link>
      <p className="mt-2 text-base font-semibold text-primary">{!dish.available ? "Indisponível" : discountedPrice(dish.price, dish.category, settings.discountPercent, dish.discount) < dish.price ? <><span className="mr-2 text-xs font-normal text-muted-foreground line-through">{money(dish.price)}</span>{money(discountedPrice(dish.price, dish.category, settings.discountPercent, dish.discount))}<span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">-{effectiveDiscount(dish.category, settings.discountPercent, dish.discount)}%</span></> : money(dish.price)}</p>
    </div>
  </article>;
}

export function MenuPage() {
  const { data: dishes } = useSuspenseQuery(menuQuery);
  const { data: categories } = useSuspenseQuery(menuCategoriesQuery);
  const [category,setCategory] = useState("todas"); const [query,setQuery] = useState("");
  const normalize = (s:string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const list = dishes.filter(p => (category === "todas" || p.category === category) && normalize(p.name+" "+p.description).includes(normalize(query)));
  return <div className="page-width py-12"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-semibold text-primary">FEITO PARA O SEU APETITE</p><h1 className="section-title">O nosso cardápio</h1><p className="mt-3 text-sm text-muted-foreground">Hambúrgueres, pizzas e muito mais. Escolha o seu favorito.</p></div><label className="relative"><Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" /><input aria-label="Pesquisar no cardápio" placeholder="O que lhe apetece?" value={query} onChange={e=>setQuery(e.target.value)} className="h-11 w-full rounded-md border border-input bg-card pl-11 pr-4 text-sm md:w-72" /></label></div><nav aria-label="Categorias do cardápio" className="my-8 flex gap-2 overflow-x-auto border-b border-border pb-5"><Button variant={category === "todas" ? "default" : "ghost"} onClick={()=>setCategory("todas")}>Tudo</Button>{categories.map(c=><Button key={c.id} variant={category === c.slug ? "default" : "ghost"} onClick={()=>setCategory(c.slug)} className="shrink-0">{c.name}</Button>)}</nav><p className="mb-5 text-xs text-muted-foreground">{list.length} opções</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map(p=><DishCard key={p.id} dish={p} />)}</div>{!list.length && <p className="py-16 text-center text-muted-foreground">Não encontrámos pratos para esta pesquisa.</p>}</div>;
}
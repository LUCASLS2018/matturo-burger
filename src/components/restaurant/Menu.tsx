import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Search, Utensils, Minus, Plus, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, dishes, type Dish } from "@/lib/menu";
import { money } from "@/lib/restaurant";
import { dishCutout } from "@/lib/dish-images";

export function DishCard({ dish }: { dish: Dish }) {
  const [quantity, setQuantity] = useState(1);
  const cutout = dishCutout(dish.slug);
  if (cutout) return <article className="burger-card group">
    <div className="burger-card-panel" />
    <Link to="/produto/$slug" params={{ slug: dish.slug }} className="burger-card-photo" aria-label={dish.name}><img src={cutout} alt={dish.name} loading="lazy" className="food-photo h-full w-full object-contain" /></Link>
    <div className="burger-card-content">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Button size="icon" variant="outline" className="h-7 w-7 rounded-md border-0 bg-primary/15 text-primary" title={`Diminuir quantidade de ${dish.name}`} aria-label={`Diminuir quantidade de ${dish.name}`} disabled={quantity === 1} onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus className="h-3 w-3" /></Button>
        <span className="w-4 text-center text-xs font-semibold" aria-label={`Quantidade de ${dish.name}`}>{quantity}</span>
        <Button size="icon" className="h-7 w-7 rounded-md" title={`Aumentar quantidade de ${dish.name}`} aria-label={`Aumentar quantidade de ${dish.name}`} onClick={() => setQuantity(q => q + 1)}><Plus className="h-3 w-3" /></Button>
        <Button asChild size="icon" variant="outline" className="ml-1 h-9 w-9 border-0 bg-card text-primary" disabled={!dish.available} title={`Selecionar ${dish.name}`}><Link to="/produto/$slug" params={{ slug: dish.slug }} search={{ quantidade: quantity }} aria-label={`Selecionar ${dish.name}`}><ShoppingBasket className="h-4 w-4" /></Link></Button>
      </div>
      <Link to="/produto/$slug" params={{ slug: dish.slug }}><h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5">{dish.name}</h3></Link>
      <p className="mt-2 text-base font-semibold text-primary">{dish.available ? money(dish.price) : "Indisponível"}</p>
    </div>
  </article>;
  return <Link to="/produto/$slug" params={{ slug: dish.slug }} className="group overflow-hidden rounded-lg border border-border bg-card">
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">{dish.image ? <img src={dish.image} alt={dish.name} loading="lazy" className="food-photo h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><Utensils className="h-10 w-10 text-muted-foreground/40" /></div>}{!dish.available && <span className="absolute left-3 top-3 rounded bg-background px-2 py-1 text-xs">Indisponível</span>}</div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold leading-snug">{dish.name}</h3><ArrowUpRight className="h-4 w-4 shrink-0 text-primary" /></div><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{dish.description}</p><p className="mt-4 font-semibold text-primary">{dish.price > 0 ? money(dish.price) : "Consultar disponibilidade"}</p></div>
  </Link>;
}

export function MenuPage() {
  const [category,setCategory] = useState("todas"); const [query,setQuery] = useState("");
  const normalize = (s:string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const list = dishes.filter(p => (category === "todas" || p.category === category) && normalize(p.name+" "+p.description).includes(normalize(query)));
  return <div className="page-width py-12"><div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="mb-3 text-sm font-semibold text-primary">FEITO PARA O SEU APETITE</p><h1 className="section-title">O nosso cardápio</h1><p className="mt-3 text-sm text-muted-foreground">Hambúrgueres, pizzas e muito mais. Escolha o seu favorito.</p></div><label className="relative"><Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground" /><input aria-label="Pesquisar no cardápio" placeholder="O que lhe apetece?" value={query} onChange={e=>setQuery(e.target.value)} className="h-11 w-full rounded-md border border-input bg-card pl-11 pr-4 text-sm md:w-72" /></label></div><nav aria-label="Categorias do cardápio" className="my-8 flex gap-2 overflow-x-auto border-b border-border pb-5"><Button variant={category === "todas" ? "default" : "ghost"} onClick={()=>setCategory("todas")}>Tudo</Button>{categories.map(c=><Button key={c.id} variant={category === c.slug ? "default" : "ghost"} onClick={()=>setCategory(c.slug)} className="shrink-0">{c.name}</Button>)}</nav><p className="mb-5 text-xs text-muted-foreground">{list.length} opções</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{list.map(p=><DishCard key={p.id} dish={p} />)}</div>{!list.length && <p className="py-16 text-center text-muted-foreground">Não encontrámos pratos para esta pesquisa.</p>}</div>;
}
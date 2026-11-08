import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { dishes } from "@/lib/menu";
import { restaurant, restaurantHead } from "@/lib/restaurant";
export const Route = createFileRoute("/sobre")({head:()=>restaurantHead("O Matturo", "Conheça o Matturo Burger: pizzas e hambúrgueres em Vila Franca de Xira."),component:About});
function About(){ const image=dishes.find(p=>p.slug==="hamburguer-matturo")?.image;return <div className="page-width py-16"><p className="mb-3 text-sm font-semibold text-primary">O MATTURO</p><h1 className="section-title">Seja bem-vindo ao Matturo.</h1><p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{restaurant.description}</p>{image&&<img src={image} alt="Hambúrguer Matturo" className="mt-10 max-h-[500px] w-full object-cover" />}<div className="mt-10 flex flex-wrap gap-4"><Button asChild><Link to="/cardapio">Consultar cardápio</Link></Button><Button asChild variant="outline"><Link to="/contactos">Contactos e localização</Link></Button></div></div>;}

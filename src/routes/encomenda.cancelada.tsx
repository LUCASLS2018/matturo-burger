import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { restaurantHead } from "@/lib/restaurant";
export const Route = createFileRoute("/encomenda/cancelada")({head:()=>restaurantHead("Pedido não confirmado", "Contacte o Matturo Burger para confirmar o estado do seu pedido."),component:Status});
function Status(){return <div className="page-width py-20"><h1 className="section-title">Confirme o pedido com o Matturo</h1><p className="mt-5 text-muted-foreground">A confirmação é feita diretamente pelo restaurante.</p><Button asChild className="mt-7"><Link to="/contactos">Contactar o restaurante</Link></Button></div>;}

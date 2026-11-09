import { orderNumber } from "@/lib/order-number";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { LogOut, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { myLoyalty, myOrders } from "@/lib/orders.functions";
import { orderStatusLabels, type OrderStatus } from "@/lib/order-pricing";
import { money, restaurantHead } from "@/lib/restaurant";

const loyaltyQuery = queryOptions({ queryKey: ["matturo-my-loyalty"], queryFn: () => myLoyalty() });
const accountOrdersQuery = queryOptions({ queryKey: ["matturo-my-orders"], queryFn: () => myOrders(), refetchInterval: 15000 });
export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => restaurantHead("Os meus pedidos", "Histórico privado dos seus pedidos Matturo Burger."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(accountOrdersQuery), context.queryClient.ensureQueryData(loyaltyQuery)]),
  component: CustomerAccount,
});

function CustomerAccount() {
  const { data: orders } = useSuspenseQuery(accountOrdersQuery);
  const { data: points } = useSuspenseQuery(loyaltyQuery);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return <div className="page-width max-w-4xl py-12">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-xs font-semibold text-primary">MATTURO · CLIENTE</p><h1 className="section-title">Os meus pedidos</h1><p className="mt-3 text-sm text-muted-foreground">Só a sua conta pode consultar este histórico.</p></div><Button variant="outline" onClick={async () => { await supabase.auth.signOut(); await queryClient.cancelQueries(); queryClient.clear(); await navigate({ to: "/conta", replace: true }); }}><LogOut />Sair</Button></div>
    <div className="mt-8 border-y border-border py-5"><p className="text-xs font-semibold text-primary">CARTEIRA DE FIDELIZAÇÃO</p>{points.verified && <p className="mt-1 text-2xl font-bold">{points.available} pontos</p>}<Button asChild variant="link" className="mt-2 px-0"><Link to="/pontos">{points.verified ? "Ver pontos e resgatar" : "Confirmar telemóvel e consultar pontos"}</Link></Button></div>
    {!orders.length && <div className="mt-12 rounded-lg border border-border bg-card p-8 text-center"><PackageOpen className="mx-auto h-10 w-10 text-primary" /><h2 className="mt-4 text-lg font-semibold">Ainda não há pedidos nesta conta</h2><p className="mt-2 text-sm text-muted-foreground">Os pedidos feitos com esta sessão iniciada aparecem aqui.</p><Button asChild className="mt-5"><Link to="/cardapio">Ver cardápio</Link></Button></div>}
    <div className="mt-8 space-y-5">{orders.map((order) => <article key={order.id} className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold">#{orderNumber(order)} · {order.service}</h2><p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleString("pt-PT")}</p>{order.scheduled_for && <p className="mt-1 text-xs font-semibold text-primary">Agendado para {new Date(order.scheduled_for).toLocaleString("pt-PT", { timeZone: "Europe/Lisbon" })}</p>}</div><span className="h-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{order.status === "novo" && order.scheduled_for ? "Agendado" : orderStatusLabels[order.status as OrderStatus]}</span></div>
      <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">{order.matturo_order_items.map((item, index) => <li key={index}><div className="flex justify-between gap-3"><span>{item.qty}× {item.name}</span><span>{money(item.line_total_cents / 100)}</span></div>{Object.entries(item.options as Record<string, string>).map(([name, value]) => <p key={name} className="text-xs text-muted-foreground">{name}: {value}</p>)}</li>)}</ul>
      <div className="mt-4 flex justify-between border-t border-border pt-3 font-semibold"><span>Total{order.delivery_fee_cents ? ` (inclui entrega ${money(order.delivery_fee_cents / 100)})` : ""}</span><span>{money(order.total_cents / 100)}</span></div>
      <details className="mt-4 text-xs"><summary className="cursor-pointer text-muted-foreground">Histórico de estados</summary><div className="mt-2 space-y-1">{order.matturo_order_events.map((event, index) => <p key={index}>{orderStatusLabels[event.status as OrderStatus]} · {new Date(event.created_at).toLocaleString("pt-PT")}</p>)}</div></details>
    </article>)}</div>
  </div>;
}

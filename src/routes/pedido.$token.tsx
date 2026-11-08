import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { orderByToken } from "@/lib/orders.functions";
import { orderStatusLabels, orderStatuses, type OrderStatus } from "@/lib/order-pricing";
import { money, restaurantHead } from "@/lib/restaurant";

const q = (token: string) => queryOptions({ queryKey: ["matturo-order", token], queryFn: () => orderByToken({ data: { token } }), refetchInterval: 10000 });

export const Route = createFileRoute("/pedido/$token")({
  head: () => ({ ...restaurantHead("O seu pedido", "Acompanhe o estado do seu pedido Matturo Burger."), meta: [...restaurantHead("O seu pedido", "Acompanhe o estado do seu pedido Matturo Burger.").meta, { name: "robots", content: "noindex" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(q(params.token)).catch(() => null),
  errorComponent: Missing,
  component: OrderPage,
});

function Missing() {
  return <div className="page-width max-w-2xl py-16"><h1 className="section-title">Pedido não encontrado</h1><p className="mt-4 text-muted-foreground">Este link não é válido.</p><Button asChild className="mt-6"><Link to="/cardapio">Ver cardápio</Link></Button></div>;
}

function OrderPage() {
  const { token } = Route.useParams();
  const { data: o } = useSuspenseQuery(q(token));
  if (!o) return <Missing />;
  const steps = orderStatuses.filter((s) => s !== "cancelado");
  const current = o.status as OrderStatus;
  return (
    <div className="page-width max-w-2xl py-12">
      <p className="text-sm text-muted-foreground">Pedido {o.reference} · {o.service}</p>
      <h1 className="section-title mt-2">{orderStatusLabels[current]}</h1>
      {current === "cancelado" ? <p className="mt-4 border-l-4 border-destructive bg-secondary p-4">Este pedido foi cancelado pelo restaurante.</p> :
        <ol className="mt-8 grid grid-cols-5 gap-2 text-center text-xs">{steps.map((s, i) => <li key={s} className={`rounded-md p-2 ${i <= steps.indexOf(current) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{orderStatusLabels[s]}</li>)}</ol>}
      <ul className="mt-8 divide-y divide-border border-y border-border">{o.items.map((i, n) => <li key={n} className="flex justify-between gap-3 py-3 text-sm"><span>{i.qty}× {i.name}</span><span className="font-semibold">{money(i.line_total_cents / 100)}</span></li>)}</ul>
      <div className="mt-4 space-y-1 text-sm">
        {o.delivery_fee_cents > 0 && <div className="flex justify-between"><span>Entrega ({o.zone_name})</span><span>{money(o.delivery_fee_cents / 100)}</span></div>}
        <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(o.total_cents / 100)}</span></div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Guarde este endereço para acompanhar o pedido. A página atualiza sozinha.</p>
    </div>
  );
}

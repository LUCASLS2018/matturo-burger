import { orderNumber } from "@/lib/order-number";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { OrderAlerts } from "@/components/restaurant/OrderAlerts";
const DeliveryMap = lazy(() => import("@/components/restaurant/DeliveryMap"));
import { orderByToken } from "@/lib/orders.functions";
import { orderStatusLabels, orderStatuses, type OrderStatus } from "@/lib/order-pricing";
import { money, restaurantHead } from "@/lib/restaurant";
import { formatLisbonDateTime } from "@/lib/opening-hours";

const q = (token: string) => queryOptions({ queryKey: ["matturo-order", token], queryFn: () => orderByToken({ data: { token } }), refetchInterval: 1000 });

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
  const stage = o ? `${o.status}|${o.tracking?.status ?? ""}` : "";
  const last = useRef(stage);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!o || last.current === stage) return;
    last.current = stage;
    const t = o.tracking;
    const msg = t?.status === "active" ? `${t.courier} está a caminho com o seu pedido!` : t?.status === "delivered" ? "O seu pedido foi entregue. Bom apetite!" : `O seu pedido está agora: ${orderStatusLabels[o.status as OrderStatus]}`;
    setNotice(msg);
    try { navigator.vibrate?.(200); } catch { /* sem vibração */ }
  }, [stage, o]);
  if (!o) return <Missing />;
  const steps = orderStatuses.filter((s) => s !== "cancelado");
  const current = o.status as OrderStatus;
  const scheduled = current === "novo" && Boolean(o.scheduled_for);
  return (
    <div className="page-width max-w-2xl py-12">
      <Dialog open={notice !== null} onOpenChange={(open) => { if (!open) setNotice(null); }}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader><DialogTitle className="flex items-center justify-center gap-2"><BellRing className="h-5 w-5 text-primary" />Atualização do pedido #{orderNumber(o)}</DialogTitle><DialogDescription className="text-base text-foreground">{notice}</DialogDescription></DialogHeader>
          <Button onClick={() => setNotice(null)}>OK</Button>
        </DialogContent>
      </Dialog>
      <p className="text-sm text-muted-foreground">Pedido #{orderNumber(o)} · {o.service}</p>
      <h1 className="section-title mt-2">{scheduled ? "Agendado" : orderStatusLabels[current]}</h1>
      {scheduled && o.scheduled_for && <p className="mt-4 border-l-4 border-primary bg-secondary p-4">Pedido agendado para <strong>{formatLisbonDateTime(o.scheduled_for)}</strong> (hora de Portugal). Será analisado e aceite pela equipa durante o horário de abertura.</p>}
      {current === "cancelado" ? <p className="mt-4 border-l-4 border-destructive bg-secondary p-4">Este pedido foi cancelado pelo restaurante.</p> :
        <ol className="mt-8 grid grid-cols-5 gap-2 text-center text-xs">{steps.map((s, i) => <li key={s} className={`rounded-md p-2 ${i <= steps.indexOf(current) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{orderStatusLabels[s]}</li>)}</ol>}
      {o.tracking && <section className="mt-8 rounded-lg border border-border bg-card p-4">
        <p className="font-semibold">{o.tracking.status === "active" ? `${o.tracking.courier} está a caminho` : o.tracking.status === "delivered" ? "Entregue" : `${o.tracking.courier} vai levar o seu pedido`}</p>
        {o.tracking.status === "active" && <><div className="mt-3"><ClientOnly fallback={<div className="h-80 bg-muted" />}><Suspense fallback={<div className="h-80 bg-muted" />}><DeliveryMap lat={o.tracking.lat} lng={o.tracking.lng} position={o.tracking.position} /></Suspense></ClientOnly></div><p className="mt-2 text-xs text-muted-foreground">{o.tracking.position ? `Última atualização: ${new Date(o.tracking.position.recorded_at).toLocaleTimeString("pt-PT")}` : "A aguardar a localização do estafeta…"}</p></>}
        {o.tracking.status === "confirmed" && <p className="mt-1 text-sm text-muted-foreground">Vai ver a localização aqui assim que a entrega começar.</p>}
      </section>}
      <ul className="mt-8 divide-y divide-border border-y border-border">{o.items.map((i, n) => <li key={n} className="flex justify-between gap-3 py-3 text-sm"><span>{i.qty}× {i.name}</span><span className="font-semibold">{money(i.line_total_cents / 100)}</span></li>)}</ul>
      <div className="mt-4 space-y-1 text-sm">
        {o.delivery_fee_cents > 0 && <div className="flex justify-between"><span>Entrega ({o.zone_name})</span><span>{money(o.delivery_fee_cents / 100)}</span></div>}
        <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(o.total_cents / 100)}</span></div>
      </div>
      <OrderAlerts orderToken={token} path={`/pedido/${token}`} />
      <p className="mt-6 text-sm text-muted-foreground">Guarde este endereço para acompanhar o pedido. A página atualiza sozinha.</p>
    </div>
  );
}

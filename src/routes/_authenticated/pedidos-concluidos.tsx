import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Bike, CheckCircle2, ChevronDown, Clock, MapPin, Phone, ShoppingBag, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminOrders } from "@/lib/orders.functions";
import { money, restaurantHead } from "@/lib/restaurant";

const completedOrdersQuery = queryOptions({
  queryKey: ["matturo-admin-orders"],
  queryFn: () => adminOrders(),
});

type AdminOrder = Awaited<ReturnType<typeof adminOrders>>[number];

export const Route = createFileRoute("/_authenticated/pedidos-concluidos")({
  head: () => restaurantHead("Pedidos concluídos", "Histórico privado de pedidos concluídos Matturo Burger."),
  loader: ({ context }) => context.queryClient.ensureQueryData(completedOrdersQuery),
  errorComponent: () => (
    <div className="page-width py-16">
      <h1 className="section-title">Acesso indisponível</h1>
      <p className="mt-4">Esta área exige acesso de administrador.</p>
      <Button asChild className="mt-6"><Link to="/pedidos">Voltar aos pedidos</Link></Button>
    </div>
  ),
  component: CompletedOrdersPage,
});

const serviceIcon = (service: string) => service === "Delivery" ? Bike : service === "Comer no local" ? Utensils : ShoppingBag;
const formatDate = (iso: string) => new Date(iso).toLocaleString("pt-PT", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

function CompletedOrdersPage() {
  const { data } = useSuspenseQuery(completedOrdersQuery);
  const [openId, setOpenId] = useState<string | null>(null);
  const completed = data.filter((order) => order.status === "concluido");
  const totalCents = completed.reduce((sum, order) => sum + order.total_cents, 0);

  return (
    <div className="page-width py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Pedidos</Link>
          <p className="text-xs font-semibold tracking-widest text-primary">MATTURO · ADMINISTRAÇÃO</p>
          <h1 className="section-title mt-1">Pedidos concluídos</h1>
          <p className="mt-2 text-sm text-muted-foreground">Consulte o histórico sem encher a central de pedidos ativos.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground"><CheckCircle2 className="h-4 w-4" />Arquivo de concluídos</span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-xl">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Pedidos concluídos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{completed.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground">Valor dos concluídos</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{money(totalCents / 100)}</p>
        </div>
      </div>

      <section className="mt-8" aria-label="Histórico de pedidos concluídos">
        {!completed.length ? (
          <p className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">Ainda não há pedidos concluídos.</p>
        ) : (
          <div className="space-y-2">
            {completed.map((order) => (
              <CompletedOrderRow
                key={order.id}
                order={order}
                expanded={openId === order.id}
                onToggle={() => setOpenId((current) => current === order.id ? null : order.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CompletedOrderRow({ order, expanded, onToggle }: { order: AdminOrder; expanded: boolean; onToggle: () => void }) {
  const Icon = serviceIcon(order.service);
  const detailsId = `concluido-${order.id}-detalhes`;

  return (
    <article className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-colors ${expanded ? "border-primary/40" : "border-border"}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/30 sm:px-4"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <b className="shrink-0 text-sm">#{order.reference}</b>
            <span className="truncate text-sm font-semibold">{order.customer_name}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3 shrink-0" />{formatDate(order.created_at)} · {order.service}</span>
        </span>
        <span className="hidden rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline-flex">Concluído</span>
        <b className="shrink-0 text-sm tabular-nums">{money(order.total_cents / 100)}</b>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div id={detailsId} className="space-y-3 border-t border-border px-4 py-4 sm:px-5">
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{order.customer_name}</p>
            <a className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary" href={`tel:${order.customer_phone}`}><Phone className="h-3 w-3" />{order.customer_phone}</a>
            {order.address && <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{order.address} · {order.postal_code} ({order.zone_name})</p>}
          </div>
          <ul className="space-y-1.5 rounded-lg bg-secondary/40 p-3 text-xs">
            {order.matturo_order_items.map((item, index) => (
              <li key={index}>
                <div className="flex justify-between gap-2"><span><b>{item.qty}×</b> {item.name}</span><span className="shrink-0 tabular-nums">{money(item.line_total_cents / 100)}</span></div>
                {Object.entries(item.options as Record<string, string>).map(([key, value]) => <p key={key} className="pl-4 text-[11px] text-muted-foreground">{key}: {value}</p>)}
              </li>
            ))}
          </ul>
          {order.notes && <p className="rounded-lg border-l-4 border-primary bg-primary/5 px-2.5 py-1.5 text-xs italic">“{order.notes}”</p>}
          <div className="flex items-end justify-between border-t border-border pt-3">
            <span className="text-[11px] text-muted-foreground">{order.delivery_fee_cents ? `Inclui entrega ${money(order.delivery_fee_cents / 100)}` : "Total"}</span>
            <span className="text-lg font-bold tabular-nums">{money(order.total_cents / 100)}</span>
          </div>
        </div>
      )}
    </article>
  );
}

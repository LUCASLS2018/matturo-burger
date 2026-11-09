import { orderNumber } from "@/lib/order-number";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ban, Bell, BellOff, Bike, CheckCircle2, ChevronDown, Clock, MapPin, Phone, Plus, Printer, ShoppingBag, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminOrders, setOrderStatus, orderCourierBoard, assignOrderCourier } from "@/lib/orders.functions";
import { groupByService, oldestFirst } from "@/lib/order-groups";
import { ServiceGroupHeading } from "@/components/restaurant/ServiceGroupHeading";
import { nextOrderSteps, type OrderStatus } from "@/lib/order-pricing";
import { money, restaurantHead } from "@/lib/restaurant";
import { ManualOrder, manualMenuQuery } from "@/components/restaurant/ManualOrder";
import { publicSettingsQuery } from "@/lib/settings-query";
import { printTicket } from "@/lib/print-ticket";
import { LiveCouriers } from "@/components/restaurant/LiveCouriers";
import { OrderSourceBadge, OrderSourceFilter } from "@/components/restaurant/OrderSourceFilter";
import { filterByOrderSource, type OrderSourceFilter as SourceFilter } from "@/lib/order-source";

const ordersQuery = queryOptions({ queryKey: ["matturo-admin-orders"], queryFn: () => adminOrders() });
const boardQuery = queryOptions({ queryKey: ["matturo-order-couriers"], queryFn: () => orderCourierBoard() });

type AdminOrder = Awaited<ReturnType<typeof adminOrders>>[number];
type Board = Awaited<ReturnType<typeof orderCourierBoard>>;

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => restaurantHead("Pedidos", "Central privada de pedidos Matturo Burger."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(ordersQuery), context.queryClient.ensureQueryData(boardQuery), context.queryClient.ensureQueryData(publicSettingsQuery)]),
  errorComponent: () => <div className="page-width py-16"><h1 className="section-title">Acesso indisponível</h1><p className="mt-4">Esta área exige acesso de administrador.</p><Button asChild className="mt-6"><Link to="/entregas">Voltar à equipa</Link></Button></div>,
  component: OrdersPage,
});

const columns: { key: OrderStatus; label: string; dot: string }[] = [
  { key: "novo", label: "Por aceitar", dot: "bg-primary" },
  { key: "aceite", label: "Aceite", dot: "bg-primary/70" },
  { key: "em_preparacao", label: "Em preparação", dot: "bg-primary/45" },
  { key: "pronto", label: "Em entrega", dot: "bg-primary/25" },
];

const boardLabels: Record<string, string> = { novo: "Por aceitar", aceite: "Aceite", em_preparacao: "Em preparação", pronto: "Em entrega", concluido: "Concluído", cancelado: "Cancelado" };
const serviceIcon = (s: string) => s === "Delivery" ? Bike : s === "Comer no local" ? Utensils : ShoppingBag;
const statusTone = (s: string) => s === "concluido" ? "bg-secondary text-muted-foreground" : s === "cancelado" ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary";
const isActive = (s: string) => !["concluido", "cancelado"].includes(s);
const timeAgo = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)} h` : new Date(iso).toLocaleDateString("pt-PT"); };

function OrdersPage() {
  const { data } = useSuspenseQuery(ordersQuery);
  const qc = useQueryClient();
  const move = useServerFn(setOrderStatus);
  const { data: board } = useSuspenseQuery(boardQuery);
  const { data: settings } = useSuspenseQuery(publicSettingsQuery);
  const assign = useServerFn(assignOrderCourier);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [showCancelled, setShowCancelled] = useState(false);
  const [tab, setTab] = useState<OrderStatus | "mapa" | "agendados">("novo");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("todos");
  const [manualOpen, setManualOpen] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const openManual = async () => {
    setLoadingManual(true);
    try {
      await Promise.all([qc.fetchQuery(manualMenuQuery), qc.fetchQuery(publicSettingsQuery)]);
      setManualOpen(true);
    } catch { toast.error("Não foi possível carregar o formulário. Tente novamente."); }
    finally { setLoadingManual(false); }
  };
  const sendToCourier = async (orderId: string) => {
    const courierId = pick[orderId] ?? board.couriers[0]?.id; if (!courierId) return;
    try { await assign({ data: { orderId, courierId } }); toast.success("Pedido enviado ao estafeta"); await qc.invalidateQueries({ queryKey: boardQuery.queryKey }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atribuir."); }
  };
  const [sound, setSound] = useState(false);
  const soundRef = useRef(sound); soundRef.current = sound;
  useEffect(() => { if (window.localStorage.getItem("matturo-order-sound") === "on") setSound(true); }, []);
  const toggleSound = () => { const next = !sound; setSound(next); window.localStorage.setItem("matturo-order-sound", next ? "on" : "off"); };
  useEffect(() => {
    const ch = supabase.channel("matturo-orders").on("postgres_changes", { event: "*", schema: "public", table: "matturo_orders" }, (p) => {
      void qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
      if (p.eventType === "INSERT") {
        toast.success((p.new as { scheduled_for?: string | null }).scheduled_for ? "Pedido agendado recebido" : "Novo pedido recebido");
      }
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);

  const today = new Date().toDateString();
  const todays = data.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelado");
  const stats = [
    { label: "Pedidos ativos", value: String(data.filter((o) => isActive(o.status)).length) },
    { label: "Pedidos hoje", value: String(todays.length) },
    { label: "Faturação hoje", value: money(todays.reduce((s, o) => s + o.total_cents, 0) / 100) },
    { label: "Estafetas", value: String(board.couriers.length) },
  ];
  const change = async (id: string, from: OrderStatus, to: OrderStatus) => {
    try { await move({ data: { id, from, to } }); await qc.invalidateQueries({ queryKey: ordersQuery.queryKey }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível guardar."); }
  };
  const visible = filterByOrderSource(data, sourceFilter);
  const sorted = oldestFirst(visible);
  const cancelled = sorted.filter((o) => o.status === "cancelado");
  const scheduled = sorted.filter((o) => o.status === "novo" && o.scheduled_for);
  const scheduledGroups = groupByService(scheduled);
  const orderingOpen = settings.isOpen && !settings.paused;

  return (
    <div className="page-width py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link to="/painel" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Painel</Link>
          <p className="text-xs font-semibold tracking-widest text-primary">MATTURO · ADMINISTRAÇÃO</p>
          <h1 className="section-title mt-1">Central de pedidos</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" disabled={loadingManual} onClick={() => void openManual()}><Plus />{loadingManual ? "A carregar…" : "Criar pedido manual"}</Button>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Em direto</span>
          <Button asChild variant="outline" size="sm"><Link to="/pedidos-concluidos"><CheckCircle2 />Concluídos</Link></Button>
          <Button variant={sound ? "default" : "outline"} size="sm" onClick={toggleSound}>{sound ? <Bell /> : <BellOff />}{sound ? "Som ligado" : "Som desligado"}</Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => <div key={s.label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{s.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p></div>)}
      </div>

      <div className="mt-4"><OrderSourceFilter value={sourceFilter} onChange={setSourceFilter} orders={data} /></div>

      <div role="tablist" aria-label="Estado dos pedidos" className="mt-8 flex gap-2 overflow-x-auto border-b border-border pb-px">
        {columns.map((col) => {
          const count = visible.filter((o) => o.status === col.key && (col.key !== "novo" || !o.scheduled_for)).length;
          const on = tab === col.key;
          return <button key={col.key} role="tab" aria-selected={on} onClick={() => setTab(col.key)} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${on ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><span className={`h-2 w-2 rounded-full ${col.dot}`} />{col.label}<span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${on ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{count}</span></button>;
        })}
        <button role="tab" aria-selected={tab === "agendados"} onClick={() => setTab("agendados")} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${tab === "agendados" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><Clock className="h-4 w-4" />Agendados<span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${tab === "agendados" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>{visible.filter((o) => o.status === "novo" && o.scheduled_for).length}</span></button>
        <button role="tab" aria-selected={tab === "mapa"} onClick={() => setTab("mapa")} className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${tab === "mapa" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}><MapPin className="h-4 w-4" />Estafetas no mapa</button>
      </div>
      <div className="mt-4">
        {tab === "mapa" && <LiveCouriers />}
        {columns.filter((col) => col.key === tab).map((col) => {
          const items = sorted.filter((o) => o.status === col.key);
          const groups = groupByService(items);
          return (
            <section key={col.key} role="tabpanel">
              {!items.length && <p className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">Sem pedidos</p>}
              {groups.map((group) => (
                <div key={group.service} className="mb-8 last:mb-0">
                  <ServiceGroupHeading service={group.service} count={group.orders.length} />
                  <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.orders.map((o) => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        board={board}
                        courierPick={pick[o.id] ?? board.couriers[0]?.id ?? ""}
                        onPick={(id, value) => setPick({ ...pick, [id]: value })}
                        onSend={sendToCourier}
                        onMove={change}
                        nearby={nearbyOrders(o, sorted, board)}
                        onSendNearby={async (ids) => { const courierId = pick[o.id] ?? board.couriers[0]?.id; if (!courierId) return; for (const id of [o.id, ...ids]) { try { await assign({ data: { orderId: id, courierId } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atribuir."); } } toast.success("Rota enviada ao estafeta"); await qc.invalidateQueries({ queryKey: boardQuery.queryKey }); }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      {cancelled.length > 0 && (
        <div className="mt-6">
          <Button variant="outline" size="sm" onClick={() => setShowCancelled(!showCancelled)}><Ban />Cancelados<span className="ml-1 rounded-full bg-secondary px-2 text-xs tabular-nums">{cancelled.length}</span></Button>
          {showCancelled && (
            <div className="mt-4 space-y-8">
              {groupByService(cancelled).map((group) => (
                <div key={group.service}>
                  <ServiceGroupHeading service={group.service} count={group.orders.length} />
                  <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {group.orders.map((o) => <OrderCard key={o.id} order={o} board={board} courierPick="" onPick={() => {}} onSend={async () => {}} onMove={change} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {manualOpen && <Suspense fallback={null}><ManualOrder onClose={() => setManualOpen(false)} /></Suspense>}
    </div>
  );
}

export function nearbyOrders<T extends { id: string; service: string; status: string; postal_code: string | null; zone_name: string | null }>(order: T, all: T[], board: { deliveries: { order_id: string | null }[] }) {
  if (order.service !== "Delivery" || !order.postal_code) return [];
  const prefix = order.postal_code.replace(/\D/g, "").slice(0, 4);
  const assigned = new Set(board.deliveries.map((d) => d.order_id));
  if (assigned.has(order.id)) return [];
  return all.filter((o) => o.id !== order.id && o.service === "Delivery" && isActive(o.status as OrderStatus) && !assigned.has(o.id)
    && ((o.postal_code ?? "").replace(/\D/g, "").slice(0, 4) === prefix || (!!order.zone_name && o.zone_name === order.zone_name)));
}

function OrderCard({ order, board, courierPick, onPick, onSend, onMove, nearby = [], onSendNearby }: {
  nearby?: AdminOrder[];
  onSendNearby?: (ids: string[]) => Promise<void>;
  order: AdminOrder;
  board: Board;
  courierPick: string;
  onPick: (orderId: string, courierId: string) => void;
  onSend: (orderId: string) => Promise<void>;
  onMove: (id: string, from: OrderStatus, to: OrderStatus) => Promise<void>;
}) {
  const Icon = serviceIcon(order.service);
  const delivery = board.deliveries.find((d) => d.order_id === order.id);
  const steps = nextOrderSteps(order.status as OrderStatus);
  const [expanded, setExpanded] = useState(false);
  const detailsId = `pedido-${order.id}-detalhes`;

  return (
    <article className={`overflow-hidden rounded-xl border bg-card shadow-sm transition-colors ${expanded ? "border-primary/40" : "border-border"}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
        className="block w-full px-3 py-3 text-left transition-colors hover:bg-secondary/30"
      >
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <b className="shrink-0 text-sm">#{orderNumber(order)}</b>
              <span className="truncate text-xs font-semibold">{order.customer_name}</span>
              <OrderSourceBadge source={order.source} />
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground"><Clock className="h-3 w-3 shrink-0" />{timeAgo(order.created_at)} · {order.service}</span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
        <span className="mt-2 flex items-center justify-between gap-2 pl-10">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusTone(order.status)}`}>{boardLabels[order.status] ?? order.status}</span>
          <b className="text-sm tabular-nums">{money(order.total_cents / 100)}</b>
        </span>
      </button>

      {expanded && (
        <div id={detailsId}>
          <div className="space-y-3 border-t border-border px-4 py-4 sm:px-5">
            <Button size="sm" variant="outline" className="h-8 w-full" onClick={() => { if (!printTicket(order)) toast.error("Permita janelas pop-up para imprimir."); }}><Printer />Imprimir talão</Button>
            <div className="space-y-1 text-sm">
              <p className="font-semibold">{order.customer_name}</p>
              <a className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary" href={`tel:${order.customer_phone}`}><Phone className="h-3 w-3" />{order.customer_phone}</a>
              {order.address && <p className="flex items-start gap-1.5 text-xs text-muted-foreground"><MapPin className="mt-0.5 h-3 w-3 shrink-0" />{order.address} · {order.postal_code} ({order.zone_name})</p>}
            </div>
            <ul className="space-y-1.5 rounded-lg bg-secondary/40 p-3 text-xs">
              {order.matturo_order_items.flatMap((i) => Array.from({ length: Math.max(1, i.qty) }, () => ({ ...i, qty: 1, line_total_cents: Math.round(i.line_total_cents / Math.max(1, i.qty)) }))).map((i, n) => <li key={n}><div className="flex justify-between gap-2"><span><b>{i.qty}×</b> {i.name}</span><span className="shrink-0 tabular-nums">{money(i.line_total_cents / 100)}</span></div>{Object.entries(i.options as Record<string, string>).map(([k, v]) => <p key={k} className="pl-4 text-[11px] text-muted-foreground">{k}: {v}</p>)}</li>)}
            </ul>
            {order.notes && <p className="rounded-lg border-l-4 border-primary bg-primary/5 px-2.5 py-1.5 text-xs italic">“{order.notes}”</p>}
            <div className="flex items-end justify-between border-t border-border pt-3">
              <span className="text-[11px] text-muted-foreground">{order.delivery_fee_cents ? `Inclui entrega ${money(order.delivery_fee_cents / 100)}` : "Total"}</span>
              <span className="text-lg font-bold tabular-nums">{money(order.total_cents / 100)}</span>
            </div>
            {order.service === "Delivery" && isActive(order.status) && (delivery
              ? <p className="flex items-center gap-2 rounded-lg bg-secondary px-2.5 py-1.5 text-xs"><Bike className="h-3.5 w-3.5 text-primary" />Estafeta: <b>{board.couriers.find((c) => c.id === delivery.courier_id)?.name ?? "—"}</b> · {delivery.status === "active" ? "a caminho" : delivery.status === "delivered" ? "entregue" : "atribuído"}</p>
              : !board.couriers.length
                ? <p className="text-xs text-muted-foreground">Ainda não há estafetas autorizados (adicione em Entregas → Equipa).</p>
                : <>{nearby.length > 0 && <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 text-xs"><p className="font-semibold text-primary">{nearby.length} pedido{nearby.length > 1 ? "s" : ""} perto deste cliente</p><ul className="mt-1 space-y-0.5 text-muted-foreground">{nearby.map((n) => <li key={n.id}>#{orderNumber(n)} · {n.customer_name} · {n.address}</li>)}</ul><Button size="sm" className="mt-2 h-8 w-full" onClick={() => void onSendNearby?.(nearby.map((n) => n.id))}><Bike />Enviar todos ao mesmo estafeta</Button></div>}<div className="flex gap-2"><select aria-label="Estafeta" className="h-8 flex-1 rounded-md border border-input bg-card px-2 text-xs" value={courierPick} onChange={(e) => onPick(order.id, e.target.value)}>{board.couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Button size="sm" variant="outline" className="h-8" onClick={() => void onSend(order.id)}><Bike />Enviar</Button></div></>)}
          </div>
          {steps.length > 0 && <footer className="flex flex-wrap gap-2 border-t border-border px-4 py-3 sm:px-5">{steps.map((s) => <Button key={s} size="sm" className={s === "cancelado" ? "" : "flex-1"} variant={s === "cancelado" ? "ghost" : "default"} onClick={() => void onMove(order.id, order.status as OrderStatus, s)}>{s === "cancelado" ? "Cancelar" : boardLabels[s]}</Button>)}</footer>}
        </div>
      )}
    </article>
  );
}

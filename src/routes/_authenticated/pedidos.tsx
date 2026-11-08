import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellOff, Bike, Clock, MapPin, Phone, ReceiptText, ShoppingBag, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { adminOrders, setOrderStatus, orderCourierBoard, assignOrderCourier } from "@/lib/orders.functions";
import { nextOrderSteps, orderStatusLabels, type OrderStatus } from "@/lib/order-pricing";
import { money, restaurantHead } from "@/lib/restaurant";

const ordersQuery = queryOptions({ queryKey: ["matturo-admin-orders"], queryFn: () => adminOrders() });
const boardQuery = queryOptions({ queryKey: ["matturo-order-couriers"], queryFn: () => orderCourierBoard() });

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => restaurantHead("Pedidos", "Central privada de pedidos Matturo Burger."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(ordersQuery), context.queryClient.ensureQueryData(boardQuery)]),
  errorComponent: () => <div className="page-width py-16"><h1 className="section-title">Acesso indisponível</h1><p className="mt-4">Esta área exige acesso de administrador.</p><Button asChild className="mt-6"><Link to="/entregas">Voltar à equipa</Link></Button></div>,
  component: OrdersPage,
});

const filters = ["ativos", "concluido", "cancelado"] as const;
const serviceIcon = (s: string) => s === "Delivery" ? Bike : s === "Comer no local" ? Utensils : ShoppingBag;
const statusTone = (s: string) => s === "concluido" ? "bg-secondary text-muted-foreground" : s === "cancelado" ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary";
const timeAgo = (iso: string) => { const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "agora" : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)} h` : new Date(iso).toLocaleDateString("pt-PT"); };

function OrdersPage() {
  const { data } = useSuspenseQuery(ordersQuery);
  const qc = useQueryClient();
  const move = useServerFn(setOrderStatus);
  const { data: board } = useSuspenseQuery(boardQuery);
  const assign = useServerFn(assignOrderCourier);
  const [pick, setPick] = useState<Record<string, string>>({});
  const sendToCourier = async (orderId: string) => {
    const courierId = pick[orderId] ?? board.couriers[0]?.id; if (!courierId) return;
    try { await assign({ data: { orderId, courierId } }); toast.success("Pedido enviado ao estafeta"); await qc.invalidateQueries({ queryKey: boardQuery.queryKey }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível atribuir."); }
  };
  const [filter, setFilter] = useState<(typeof filters)[number]>("ativos");
  const [sound, setSound] = useState(false);
  const soundRef = useRef(sound); soundRef.current = sound;
  useEffect(() => {
    const ch = supabase.channel("matturo-orders").on("postgres_changes", { event: "*", schema: "public", table: "matturo_orders" }, (p) => {
      void qc.invalidateQueries({ queryKey: ordersQuery.queryKey });
      if (p.eventType === "INSERT") {
        toast.success("Novo pedido recebido");
        if (soundRef.current) { const a = new AudioContext(); const o = a.createOscillator(); o.connect(a.destination); o.frequency.value = 880; o.start(); o.stop(a.currentTime + 0.4); }
      }
    }).subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [qc]);
  const isActive = (s: string) => !["concluido", "cancelado"].includes(s);
  const list = data.filter((o) => filter === "ativos" ? isActive(o.status) : o.status === filter);
  const count = (f: (typeof filters)[number]) => data.filter((o) => f === "ativos" ? isActive(o.status) : o.status === f).length;
  const today = new Date().toDateString();
  const todays = data.filter((o) => new Date(o.created_at).toDateString() === today && o.status !== "cancelado");
  const stats = [
    { label: "Pedidos ativos", value: String(count("ativos")) },
    { label: "Pedidos hoje", value: String(todays.length) },
    { label: "Faturação hoje", value: money(todays.reduce((s, o) => s + o.total_cents, 0) / 100) },
    { label: "Estafetas", value: String(board.couriers.length) },
  ];
  const change = async (id: string, from: OrderStatus, to: OrderStatus) => {
    try { await move({ data: { id, from, to } }); await qc.invalidateQueries({ queryKey: ordersQuery.queryKey }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível guardar."); }
  };
  return (
    <div className="page-width py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <Link to="/painel" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" />Painel</Link>
          <p className="text-xs font-semibold tracking-widest text-primary">MATTURO · ADMINISTRAÇÃO</p>
          <h1 className="section-title mt-1">Central de pedidos</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Em direto</span>
          <Button variant={sound ? "default" : "outline"} size="sm" onClick={() => setSound(!sound)}>{sound ? <Bell /> : <BellOff />}{sound ? "Som ligado" : "Som desligado"}</Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => <div key={s.label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-medium text-muted-foreground">{s.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p></div>)}
      </div>

      <div className="mt-8 inline-flex rounded-lg border border-border bg-card p-1">
        {filters.map((f) => <button key={f} onClick={() => setFilter(f)} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${f === filter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{f === "ativos" ? "Ativos" : orderStatusLabels[f]}<span className={`rounded-full px-2 text-xs ${f === filter ? "bg-primary-foreground/20" : "bg-secondary"}`}>{count(f)}</span></button>)}
      </div>

      {!list.length && <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground"><ReceiptText className="mx-auto mb-3 h-8 w-8" />Sem pedidos nesta lista.</div>}

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {list.map((o) => {
          const Icon = serviceIcon(o.service);
          const d = board.deliveries.find((x) => x.order_id === o.id);
          return (
            <article key={o.id} className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <header className="flex items-start justify-between gap-3 border-b border-border bg-secondary/40 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span>
                  <div><p className="font-bold">#{o.reference}</p><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{timeAgo(o.created_at)} · {o.service}</p></div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(o.status)}`}>{orderStatusLabels[o.status as OrderStatus]}</span>
              </header>
              <div className="space-y-4 px-5 py-4">
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{o.customer_name}</p>
                  <a className="flex items-center gap-2 text-muted-foreground hover:text-primary" href={`tel:${o.customer_phone}`}><Phone className="h-3.5 w-3.5" />{o.customer_phone}</a>
                  {o.address && <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{o.address} · {o.postal_code} ({o.zone_name})</p>}
                </div>
                <ul className="space-y-2 rounded-lg bg-secondary/40 p-3 text-sm">
                  {o.matturo_order_items.map((i, n) => <li key={n}><div className="flex justify-between gap-3"><span><b>{i.qty}×</b> {i.name}</span><span className="tabular-nums">{money(i.line_total_cents / 100)}</span></div>{Object.entries(i.options as Record<string, string>).map(([k, v]) => <p key={k} className="pl-5 text-xs text-muted-foreground">{k}: {v}</p>)}</li>)}
                </ul>
                {o.notes && <p className="rounded-lg border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm italic">“{o.notes}”</p>}
                <div className="flex items-end justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">{o.delivery_fee_cents ? `Inclui entrega ${money(o.delivery_fee_cents / 100)}` : "Total"}</span>
                  <span className="text-xl font-bold tabular-nums">{money(o.total_cents / 100)}</span>
                </div>
                {o.service === "Delivery" && isActive(o.status) && (d
                  ? <p className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm"><Bike className="h-4 w-4 text-primary" />Estafeta: <b>{board.couriers.find((c) => c.id === d.courier_id)?.name ?? "—"}</b> · {d.status === "active" ? "a caminho" : d.status === "delivered" ? "entregue" : "atribuído"}</p>
                  : !board.couriers.length
                    ? <p className="text-sm text-muted-foreground">Ainda não há estafetas autorizados (adicione em Entregas → Equipa).</p>
                    : <div className="flex gap-2"><select aria-label="Estafeta" className="h-9 flex-1 rounded-md border border-input bg-card px-2 text-sm" value={pick[o.id] ?? board.couriers[0]?.id} onChange={(e) => setPick({ ...pick, [o.id]: e.target.value })}>{board.couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Button size="sm" variant="outline" onClick={() => void sendToCourier(o.id)}><Bike />Enviar</Button></div>)}
              </div>
              {nextOrderSteps(o.status as OrderStatus).length > 0 && <footer className="flex flex-wrap gap-2 border-t border-border px-5 py-3">{nextOrderSteps(o.status as OrderStatus).map((s) => <Button key={s} size="sm" className={s === "cancelado" ? "" : "flex-1"} variant={s === "cancelado" ? "ghost" : "default"} onClick={() => void change(o.id, o.status as OrderStatus, s)}>{s === "cancelado" ? "Cancelar" : orderStatusLabels[s]}</Button>)}</footer>}
            </article>
          );
        })}
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
  const list = data.filter((o) => filter === "ativos" ? !["concluido", "cancelado"].includes(o.status) : o.status === filter);
  const change = async (id: string, from: OrderStatus, to: OrderStatus) => {
    try { await move({ data: { id, from, to } }); await qc.invalidateQueries({ queryKey: ordersQuery.queryKey }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível guardar."); }
  };
  return (
    <div className="page-width py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="section-title">Pedidos</h1>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />Som para novos pedidos</label>
      </div>
      <div className="mt-6 flex gap-2">{filters.map((f) => <Button key={f} size="sm" variant={f === filter ? "default" : "outline"} onClick={() => setFilter(f)}>{f === "ativos" ? "Ativos" : orderStatusLabels[f]}</Button>)}</div>
      {!list.length && <p className="mt-10 text-muted-foreground">Sem pedidos aqui.</p>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {list.map((o) => (
          <article key={o.id} className="rounded-lg border border-border bg-card p-5">
            <div className="flex justify-between gap-3"><div><p className="font-semibold">{o.reference} · {o.service}</p><p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("pt-PT")}</p></div><span className="h-fit rounded-full bg-secondary px-3 py-1 text-xs font-semibold">{orderStatusLabels[o.status as OrderStatus]}</span></div>
            <p className="mt-3 text-sm">{o.customer_name} · <a className="underline" href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></p>
            {o.address && <p className="text-sm">{o.address} · {o.postal_code} ({o.zone_name})</p>}
            <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">{o.matturo_order_items.map((i, n) => <li key={n}><div className="flex justify-between"><span>{i.qty}× {i.name}</span><span>{money(i.line_total_cents / 100)}</span></div>{Object.entries(i.options as Record<string, string>).map(([k, v]) => <p key={k} className="text-xs text-muted-foreground">{k}: {v}</p>)}</li>)}</ul>
            {o.notes && <p className="mt-2 text-sm italic">“{o.notes}”</p>}
            <p className="mt-3 flex justify-between border-t border-border pt-3 font-semibold"><span>Total{o.delivery_fee_cents ? ` (inclui entrega ${money(o.delivery_fee_cents / 100)})` : ""}</span><span>{money(o.total_cents / 100)}</span></p>
            {o.service === "Delivery" && !["concluido", "cancelado"].includes(o.status) && (() => { const d = board.deliveries.find((x) => x.order_id === o.id); if (d) return <p className="mt-3 rounded-md bg-secondary p-2 text-sm">Estafeta: <b>{board.couriers.find((c) => c.id === d.courier_id)?.name ?? "—"}</b> · {d.status === "active" ? "a caminho" : d.status === "delivered" ? "entregue" : "atribuído"}</p>; if (!board.couriers.length) return <p className="mt-3 text-sm text-muted-foreground">Ainda não há estafetas autorizados (adicione em Entregas → Equipa).</p>; return <div className="mt-3 flex flex-wrap gap-2"><select aria-label="Estafeta" className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={pick[o.id] ?? board.couriers[0]?.id} onChange={(e) => setPick({ ...pick, [o.id]: e.target.value })}>{board.couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><Button size="sm" variant="outline" onClick={() => void sendToCourier(o.id)}>Enviar ao estafeta</Button></div>; })()}
            <div className="mt-4 flex flex-wrap gap-2">{nextOrderSteps(o.status as OrderStatus).map((s) => <Button key={s} size="sm" variant={s === "cancelado" ? "outline" : "default"} onClick={() => void change(o.id, o.status as OrderStatus, s)}>{s === "cancelado" ? "Cancelar" : orderStatusLabels[s]}</Button>)}</div>
          </article>
        ))}
      </div>
    </div>
  );
}

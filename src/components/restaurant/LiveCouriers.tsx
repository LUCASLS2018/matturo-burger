import { lazy, Suspense, useMemo, useEffect } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { Bike } from "lucide-react";
import { liveCouriersFeed } from "@/lib/delivery.functions";
import { orderNumber } from "@/lib/order-number";
import type { CourierPoint } from "./CouriersMap";

const CouriersMap = lazy(() => import("./CouriersMap"));

const ago = (iso: string) => { const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000); return s < 60 ? `há ${s} s` : `há ${Math.round(s / 60)} min`; };

/** Admin view of couriers on an active delivery, refreshed every few seconds. */
export function LiveCouriers() {
  const load = useServerFn(liveCouriersFeed);
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase.channel("admin-live-couriers")
      .on("postgres_changes", { event: "*", schema: "public", table: "matturo_deliveries" }, () => qc.invalidateQueries({ queryKey: ["matturo-live-couriers"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "matturo_delivery_positions" }, () => qc.invalidateQueries({ queryKey: ["matturo-live-couriers"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
  const { data, isLoading, error } = useQuery({ queryKey: ["matturo-live-couriers"], queryFn: () => load(), refetchInterval: 4000 });

  const rows = useMemo(() => {
    if (!data) return [];
    return data.deliveries.filter((d) => !d.order_id || data.orders.some((o) => o.id === d.order_id)).map((d) => {
      const pos = data.positions.find((p) => p.delivery_id === d.id);
      const order = data.orders.find((o) => o.id === d.order_id);
      const name = data.profiles.find((p) => p.id === d.courier_id)?.name?.split(" ")[0] || "Estafeta";
      return { d, pos, order, name, label: order ? `#${orderNumber(order)}` : d.reference };
    });
  }, [data]);

  const points: CourierPoint[] = rows.map((r) => ({ id: r.d.id, name: r.name, label: r.label, lat: r.pos?.latitude ?? null, lng: r.pos?.longitude ?? null, destLat: r.d.destination_lat, destLng: r.d.destination_lng }));

  if (isLoading) return <p className="py-10 text-center text-xs text-muted-foreground">A carregar estafetas…</p>;
  if (error) return <p className="py-10 text-center text-xs text-destructive">Não foi possível carregar as localizações.</p>;

  return (
    <section role="tabpanel" className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <ClientOnly fallback={<div className="h-[520px] rounded-xl border border-border bg-card" />}>
        <Suspense fallback={<div className="h-[520px] rounded-xl border border-border bg-card" />}>
          <CouriersMap points={points} />
        </Suspense>
      </ClientOnly>
      <div className="space-y-3">
        {!rows.length && <p className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">Nenhum estafeta a entregar agora.</p>}
        {rows.map((r) => (
          <div key={r.d.id} className="rounded-xl border border-border bg-card p-3 text-sm">
            <p className="flex items-center gap-2 font-semibold"><Bike className="h-4 w-4 text-primary" />{r.name} <span className="text-muted-foreground">· {r.label}</span></p>
            <p className="mt-1 text-xs text-muted-foreground">{r.order?.customer_name ?? ""} — {r.d.destination}</p>
            <p className="mt-1 text-xs font-medium text-primary">{({ to_restaurant: "Atribuída — a caminho do restaurante", collected: "Pedido recolhido", active: "Em entrega" } as Record<string,string>)[r.d.status] ?? r.d.status}</p>
            <p className="mt-1 text-xs">{r.pos ? `Posição atualizada ${ago(r.pos.recorded_at)}` : "A aguardar o GPS do estafeta…"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

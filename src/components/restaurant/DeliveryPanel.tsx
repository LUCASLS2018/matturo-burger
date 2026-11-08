import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authorizeCourier, changeDelivery, deliveryDashboard, issueTrackingLink, recordPosition, setCourierAvailability } from "@/lib/delivery.functions";
import { deliveryLabels, nextDeliveryState } from "@/lib/delivery";
import { money } from "@/lib/restaurant";
import { MapPin, LogOut, Play, Check, Link as LinkIcon, Camera, Navigation, PackageCheck, Bike } from "lucide-react";

const Map = lazy(() => import("./DeliveryMap"));
type Data = Awaited<ReturnType<typeof deliveryDashboard>>;
const openStates = ["confirmed", "to_restaurant", "collected", "active"];

export default function DeliveryPanel({ data }: { data: Data }) {
  const query = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tracking, setTracking] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [name, setName] = useState(data.profile?.name ?? "");
  const [photo, setPhoto] = useState("");
  const watch = useRef<number | null>(null);
  const inFlight = useRef(false);
  const lastSent = useRef(0);
  const refresh = () => query.invalidateQueries({ queryKey: ["matturo-deliveries"] });
  const stop = () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; setTracking(null); };

  useEffect(() => {
    const channel = supabase.channel(`matturo-panel-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matturo_deliveries" }, () => { void refresh(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "matturo_delivery_positions" }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); };
  }, []);
  useEffect(() => { if (tracking && !data.deliveries.some((delivery) => delivery.id === tracking && delivery.status === "active")) stop(); }, [data.deliveries, tracking]);
  useEffect(() => { if (data.profile?.photo_path) void supabase.storage.from("matturo-courier-photos").createSignedUrl(data.profile.photo_path, 300).then((result) => setPhoto(result.data?.signedUrl ?? "")); }, [data.profile?.photo_path]);

  const run = async (operation: () => Promise<unknown>) => {
    setError(""); setBusy(true);
    try { await operation(); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Operação indisponível."); }
    finally { setBusy(false); }
  };

  const start = (id: string, resume = false) => {
    if (!navigator.geolocation) { setError("GPS indisponível neste dispositivo."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        if (!resume) await changeDelivery({ data: { id, status: "active" } });
        stop(); setTracking(id);
        await recordPosition({ data: { id, lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy } });
        watch.current = navigator.geolocation.watchPosition(async (current) => {
          if (inFlight.current || Date.now() - lastSent.current < 5000) return;
          inFlight.current = true; lastSent.current = Date.now();
          try { await recordPosition({ data: { id, lat: current.coords.latitude, lng: current.coords.longitude, accuracy: current.coords.accuracy } }); }
          catch { setError("Localização não atualizada. Verifique a ligação."); }
          finally { inFlight.current = false; }
        }, () => setError("Não foi possível obter o GPS."), { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
        await refresh();
      } catch (cause) { stop(); setError(cause instanceof Error ? cause.message : "Não foi possível iniciar."); }
      finally { setBusy(false); }
    }, () => { setError("Autorize o acesso à localização para iniciar a entrega."); setBusy(false); }, { enableHighAccuracy: true, timeout: 20000 });
  };

  const ownAvailability = data.availability.find((row) => row.user_id === data.userId);
  const ownOpen = data.deliveries.filter((delivery) => delivery.courier_id === data.userId && openStates.includes(delivery.status)).length;
  const availability = ownOpen ? "busy" : ownAvailability?.state ?? "available";

  return <div className="page-width py-12">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="mb-2 text-xs font-semibold text-primary">MATTURO · ENTREGAS</p><h1 className="section-title">{data.admin ? "Gestão de entregas" : "As minhas entregas"}</h1></div><Button variant="outline" onClick={() => run(async () => { stop(); await query.cancelQueries(); query.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); })}><LogOut />Sair</Button></div>

    <section className="mt-8 border-y border-border py-6"><h2 className="font-semibold">O meu perfil</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">{photo && <img src={photo} alt="Foto do estafeta" className="h-16 w-16 rounded object-cover" />}<label className="text-sm">Nome<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="ml-3 h-10 rounded-md border border-input bg-card px-3" /></label><Button variant="outline" disabled={busy} onClick={() => run(async () => { const result = await supabase.from("matturo_profiles").update({ name: name.trim() }).eq("id", data.userId); if (result.error) throw result.error; })}>Guardar</Button><label className="inline-flex cursor-pointer items-center gap-2 text-sm"><Camera />Foto<input type="file" accept="image/png,image/jpeg,image/webp" className="max-w-52 text-xs" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void run(async () => { if (file.size > 2 * 1024 * 1024) throw new Error("A foto deve ter até 2 MB."); const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; const path = `${data.userId}/${crypto.randomUUID()}.${extension}`; const uploaded = await supabase.storage.from("matturo-courier-photos").upload(path, file); if (uploaded.error) throw uploaded.error; const updated = await supabase.from("matturo_profiles").update({ photo_path: path }).eq("id", data.userId); if (updated.error) throw updated.error; }); }} /></label></div>
      {data.courier && <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5"><p className="text-sm">Estado: <strong>{availability === "busy" ? `Ocupado · ${ownOpen} entrega${ownOpen === 1 ? "" : "s"} ativa${ownOpen === 1 ? "" : "s"}` : availability === "inactive" ? "Inativo" : "Disponível"}</strong></p><Button size="sm" variant="outline" disabled={busy || availability === "busy"} onClick={() => run(() => setCourierAvailability({ data: { state: availability === "inactive" ? "available" : "inactive" } }))}>{availability === "inactive" ? "Ficar disponível" : "Ficar inativo"}</Button>{availability === "busy" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setCourierAvailability({ data: { state: "inactive" } }))}>Ficar inativo após as ativas</Button>}</div>}
    </section>

    {!data.admin && !data.courier && <p className="mt-8">A sua conta aguarda atribuição de acesso pelo restaurante.</p>}
    {data.admin && <section className="border-b border-border py-6"><h2 className="font-semibold">Equipa</h2><div className="mt-4 flex flex-wrap gap-4">{data.profiles.filter((profile) => !data.courierIds.includes(profile.id)).map((profile) => <Button key={profile.id} variant="outline" disabled={busy} onClick={() => run(() => authorizeCourier({ data: { userId: profile.id } }))}>Autorizar estafeta: {profile.name || profile.id}</Button>)}</div></section>}
    {error && <p role="alert" className="my-5 text-sm text-destructive">{error}</p>}
    {link && <div className="my-5 break-all border-y border-border py-4"><p className="text-sm">Link exclusivo — válido por 24 horas</p><a href={link} className="mt-2 block text-sm text-primary">{link}</a></div>}

    <section className="mt-8"><h2 className="text-lg font-semibold">Entregas</h2>{!data.deliveries.length && <p className="mt-5 text-sm text-muted-foreground">Sem entregas atribuídas.</p>}
      <div className="mt-5 grid items-start gap-6 lg:grid-cols-2">{data.deliveries.map((delivery) => {
        const position = delivery.status === "active" ? data.positions.find((item) => item.delivery_id === delivery.id) ?? null : null;
        const order = data.orders.find((item) => item.id === delivery.order_id);
        const next = nextDeliveryState[delivery.status];
        return <article key={delivery.id} className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{delivery.reference}</h3><span className="text-sm text-primary">{deliveryLabels[delivery.status]}</span></div>
          <p className="my-4 flex gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0" />{delivery.destination}</p>
          {order && <div className="mb-4 rounded-md bg-secondary/60 p-4 text-sm"><p className="font-semibold">{order.customer_name} · <a className="underline" href={`tel:${order.customer_phone}`}>{order.customer_phone}</a></p><p className="mt-1 text-xs text-muted-foreground">{order.address} · {order.postal_code}</p><ul className="mt-3 space-y-2 border-t border-border pt-3">{order.matturo_order_items.map((item, index) => <li key={index}><div className="flex justify-between gap-3"><span>{item.qty}× {item.name}</span><span>{money(item.line_total_cents / 100)}</span></div>{Object.entries(item.options as Record<string, string>).map(([key, value]) => <p key={key} className="text-xs text-muted-foreground">{key}: {value}</p>)}</li>)}</ul>{order.notes && <p className="mt-3 italic">“{order.notes}”</p>}<p className="mt-3 border-t border-border pt-3 font-semibold">Total: {money(order.total_cents / 100)}</p></div>}
          {!["delivered", "cancelled"].includes(delivery.status) && <div className="mb-4 flex flex-wrap gap-2"><Button asChild size="sm" variant="outline"><a href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.destination_lat},${delivery.destination_lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer"><Navigation />Google Maps</a></Button><Button asChild size="sm" variant="outline"><a href={`https://waze.com/ul?ll=${delivery.destination_lat},${delivery.destination_lng}&navigate=yes`} target="_blank" rel="noopener noreferrer"><Navigation />Waze</a></Button></div>}
          {data.admin && <p className="mb-4 text-sm">Estafeta: {data.profiles.find((profile) => profile.id === delivery.courier_id)?.name || "Sem nome"}</p>}
          {delivery.status === "active" && <><ClientOnly><Suspense fallback={<div className="h-96 bg-muted" />}><Map lat={delivery.destination_lat} lng={delivery.destination_lng} position={position} /></Suspense></ClientOnly><p className="mt-3 text-xs text-muted-foreground">{position ? `Última atualização: ${new Date(position.recorded_at).toLocaleString("pt-PT")}` : "A aguardar GPS"}</p></>}
          <div className="mt-5 flex flex-wrap gap-3">
            {data.courier && delivery.courier_id === data.userId && next && (next === "active" ? <Button disabled={busy || tracking !== null} onClick={() => start(delivery.id)}><Play />Iniciar entrega e GPS</Button> : <Button disabled={busy} onClick={() => run(() => changeDelivery({ data: { id: delivery.id, status: next } }))}>{next === "to_restaurant" ? <Bike /> : next === "collected" ? <PackageCheck /> : <Check />}{next === "to_restaurant" ? "A caminho do restaurante" : next === "collected" ? "Pedido recolhido" : "Finalizar entrega"}</Button>)}
            {data.courier && delivery.courier_id === data.userId && delivery.status === "active" && tracking !== delivery.id && <Button disabled={busy} variant="outline" onClick={() => start(delivery.id, true)}>Retomar GPS</Button>}
            {data.admin && <Button variant="outline" disabled={busy} onClick={() => run(async () => { const result = await issueTrackingLink({ data: { id: delivery.id } }); setLink(`${window.location.origin}/acompanhar/${result.token}`); })}><LinkIcon />Novo link</Button>}
          </div>
          <details className="mt-5 text-xs"><summary className="cursor-pointer">Histórico de estados</summary>{data.events.filter((event) => event.delivery_id === delivery.id).map((event) => <p key={event.id} className="mt-2">{deliveryLabels[event.status]} · {new Date(event.created_at).toLocaleString("pt-PT")}</p>)}</details>
        </article>;
      })}</div>
    </section>
    {data.courier && <p className="mt-8 text-sm text-muted-foreground">A localização é partilhada apenas durante a entrega ativa. Mantenha esta página aberta e o telemóvel desbloqueado.</p>}
  </div>;
}

import { orderNumber } from "@/lib/order-number";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authorizeCourier, changeDelivery, deliveryDashboard, issueTrackingLink, recordPosition, setCourierAvailability, setDeliveryPayment } from "@/lib/delivery.functions";
import { paymentFromNotes, paymentMethods } from "@/lib/payment-note";
import { deliveryLabels, nextDeliveryState } from "@/lib/delivery";
import { summarizeCourierDeliveries } from "@/lib/courier-delivery-stats";
import { summarizeDailyResults } from "@/lib/delivery-daily-results";
import { money } from "@/lib/restaurant";
import { summarizeDailySources } from "@/lib/daily-sources";
import { orderSourceLabels } from "@/lib/order-source";
import { MapPin, LogOut, Play, Check, Link as LinkIcon, Camera, Navigation, PackageCheck, Bike, ArrowLeft, Copy, Phone, Users, Radio, CheckCircle2, ChevronDown, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { CourierAlerts } from "./CourierAlerts";

const Map = lazy(() => import("./DeliveryMap"));
type Data = Awaited<ReturnType<typeof deliveryDashboard>>;
const openStates = ["confirmed", "to_restaurant", "collected", "active"];
const formatLisbonDay = (day: string) => new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${day}T12:00:00Z`));

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
  useEffect(() => { if (tracking && data.deliveries.some((delivery) => delivery.id === tracking && ["delivered", "cancelled"].includes(delivery.status))) stop(); }, [data.deliveries, tracking]);
  useEffect(() => {
    if (!tracking) return;
    const id = tracking;
    const send = (force = false) => {
      if (!navigator.geolocation || inFlight.current || (!force && Date.now() - lastSent.current < 8000)) return;
      navigator.geolocation.getCurrentPosition(async (current) => {
        if (inFlight.current) return;
        inFlight.current = true; lastSent.current = Date.now();
        try { await recordPosition({ data: { id, lat: current.coords.latitude, lng: current.coords.longitude, accuracy: current.coords.accuracy } }); setError(""); }
        catch { setError("Localização não atualizada. Verifique a ligação."); }
        finally { inFlight.current = false; }
      }, () => undefined, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    };
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
    const requestLock = async () => { try { if (nav.wakeLock && document.visibilityState === "visible") lock = await nav.wakeLock.request("screen"); } catch { /* sem wake lock */ } };
    void requestLock();
    const timer = window.setInterval(() => send(), 10000);
    const onVisible = () => { if (document.visibilityState === "visible") { void requestLock(); send(true); } };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); void lock?.release().catch(() => undefined); };
  }, [tracking]);
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
        }, () => undefined, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
        await refresh();
      } catch (cause) { stop(); setError(cause instanceof Error ? cause.message : "Não foi possível iniciar."); }
      finally { setBusy(false); }
    }, () => { setError("Autorize o acesso à localização para iniciar a entrega."); setBusy(false); }, { enableHighAccuracy: true, timeout: 20000 });
  };

  const ownAvailability = data.availability.find((row) => row.user_id === data.userId);
  const ownOpen = data.deliveries.filter((delivery) => delivery.courier_id === data.userId && openStates.includes(delivery.status)).length;
  const availability = ownOpen ? "busy" : ownAvailability?.state ?? "available";

  const [tab, setTab] = useState<"open" | "done" | "couriers" | "days">("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const active = data.deliveries.filter((d) => !["delivered", "cancelled"].includes(d.status));
  const done = data.deliveries.filter((d) => ["delivered", "cancelled"].includes(d.status));
  const list = tab === "done" ? done : active;
  const courierStats = summarizeCourierDeliveries(data.courierIds, data.profiles, data.deliveryTotals);
  const dailyResults = summarizeDailyResults(data.dailyResults, data.profiles);
  const dailySources = summarizeDailySources(data.dailySources);
  const historyDays = Array.from(new Set([...dailySources.map((d) => d.day), ...dailyResults.map((d) => d.day)])).sort((a, b) => b.localeCompare(a));
  const today = new Date().toDateString();
  const doneToday = done.filter((d) => d.status === "delivered" && data.events.some((e) => e.delivery_id === d.id && e.status === "delivered" && new Date(e.created_at).toDateString() === today)).length;
  const onRoad = active.filter((d) => d.status === "active").length;
  const freeCouriers = data.courierIds.filter((id) => !active.some((d) => d.courier_id === id) && data.availability.find((a) => a.user_id === id)?.state !== "inactive").length;
  const tone = (s: string) => s === "active" ? "bg-primary text-primary-foreground" : s === "delivered" ? "bg-secondary text-muted-foreground" : s === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-primary/15 text-primary";
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success("Link copiado"); } catch { /* ignore */ } };
  const stats = data.admin
    ? [{ label: "Entregas ativas", value: active.length, icon: Bike }, { label: "Em rota (GPS)", value: onRoad, icon: Radio }, { label: "Entregues hoje", value: doneToday, icon: CheckCircle2 }, { label: "Estafetas livres", value: `${freeCouriers}/${data.courierIds.length}`, icon: Users }]
    : [{ label: "Ativas", value: ownOpen, icon: Bike }, { label: "Entregues hoje", value: doneToday, icon: CheckCircle2 }];

  return <div className="page-width py-6 sm:py-10">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {data.admin && <Button asChild size="icon" variant="outline"><Link to="/painel" aria-label="Voltar ao painel"><ArrowLeft /></Link></Button>}
        <div><p className="text-xs font-semibold tracking-wide text-primary">MATTURO · ENTREGAS</p><h1 className="text-2xl font-bold sm:text-3xl">{data.admin ? "Gestão de entregas" : "As minhas entregas"}</h1></div>
        <span className="hidden items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:inline-flex"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Em direto</span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowProfile((v) => !v)}>{photo ? <img src={photo} alt="" className="h-5 w-5 rounded-full object-cover" /> : <Camera />}Perfil</Button>
        <Button variant="outline" size="sm" onClick={() => run(async () => { stop(); await query.cancelQueries(); query.clear(); await supabase.auth.signOut(); await navigate({ to: "/auth", replace: true }); })}><LogOut />Sair</Button>
      </div>
    </header>

    <div className={`mt-6 grid gap-3 ${data.admin ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
      {stats.map((s) => <div key={s.label} className="rounded-xl border border-border bg-card p-4"><div className="flex items-center justify-between text-xs text-muted-foreground">{s.label}<s.icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-2xl font-bold">{s.value}</p></div>)}
    </div>

    {data.courier && <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
      <span className={`h-2.5 w-2.5 rounded-full ${availability === "inactive" ? "bg-muted-foreground" : "bg-primary"}`} />
      <p className="text-sm">Estado: <strong>{availability === "busy" ? `Ocupado · ${ownOpen} entrega${ownOpen === 1 ? "" : "s"} ativa${ownOpen === 1 ? "" : "s"}` : availability === "inactive" ? "Inativo" : "Disponível"}</strong></p>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy || availability === "busy"} onClick={() => run(() => setCourierAvailability({ data: { state: availability === "inactive" ? "available" : "inactive" } }))}>{availability === "inactive" ? "Ficar disponível" : "Ficar inativo"}</Button>
        {availability === "busy" && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(() => setCourierAvailability({ data: { state: "inactive" } }))}>Inativo após as ativas</Button>}
      </div>
    </div>}

    {data.courier && <CourierAlerts />}

    {showProfile && <section className="mt-4 rounded-xl border border-border bg-card p-4"><h2 className="text-sm font-semibold">O meu perfil</h2>
      <div className="mt-3 flex flex-wrap items-center gap-3">{photo && <img src={photo} alt="Foto do estafeta" className="h-14 w-14 rounded-full object-cover" />}<input aria-label="Nome" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className="h-10 rounded-md border border-input bg-background px-3 text-sm" /><Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => { const result = await supabase.from("matturo_profiles").update({ name: name.trim() }).eq("id", data.userId); if (result.error) throw result.error; toast.success("Perfil guardado"); })}>Guardar</Button><label className="inline-flex cursor-pointer items-center gap-2 text-sm"><Camera className="h-4 w-4" />Mudar foto<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void run(async () => { if (file.size > 2 * 1024 * 1024) throw new Error("A foto deve ter até 2 MB."); const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; const path = `${data.userId}/${crypto.randomUUID()}.${extension}`; const uploaded = await supabase.storage.from("matturo-courier-photos").upload(path, file); if (uploaded.error) throw uploaded.error; const updated = await supabase.from("matturo_profiles").update({ photo_path: path }).eq("id", data.userId); if (updated.error) throw updated.error; }); }} /></label></div>
    </section>}

    {!data.admin && !data.courier && <p className="mt-8">A sua conta aguarda atribuição de acesso pelo restaurante.</p>}
    {data.admin && data.profiles.some((p) => !data.courierIds.includes(p.id)) && <section className="mt-4 rounded-xl border border-dashed border-border p-4"><h2 className="text-sm font-semibold">Novos membros por autorizar</h2><div className="mt-3 flex flex-wrap gap-2">{data.profiles.filter((profile) => !data.courierIds.includes(profile.id)).map((profile) => <Button key={profile.id} size="sm" variant="outline" disabled={busy} onClick={() => run(() => authorizeCourier({ data: { userId: profile.id } }))}><Users />Autorizar {profile.name || "sem nome"}</Button>)}</div></section>}
    {error && <p role="alert" className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {link && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3"><LinkIcon className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Link do cliente (24 h):</span><a href={link} className="min-w-0 flex-1 truncate text-sm text-primary">{link}</a><Button size="sm" onClick={copy}><Copy />Copiar</Button></div>}

    <div className="mt-6 flex gap-2 overflow-x-auto border-b border-border">
      {([["open", "Ativas", active.length], ["done", "Concluídas", done.length], ...(data.admin ? [["couriers", "Estafetas", courierStats.length] as const, ["days", "Por dia", historyDays.length] as const] : [])] as const).map(([key, label, count]) => <button key={key} onClick={() => setTab(key)} className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{label} <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-xs">{count}</span></button>)}
    </div>

    {tab === "couriers" && <section aria-label="Entregas por estafeta" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {courierStats.map((courier) => {
        const availabilityState = data.availability.find((row) => row.user_id === courier.id)?.state;
        const stateLabel = courier.active ? "Com entregas em curso" : availabilityState === "inactive" ? "Inativo" : "Disponível";
        return <article key={courier.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Bike className="h-5 w-5" /></div>
            <div className="min-w-0"><h2 className="truncate font-semibold">{courier.name}</h2><p className="mt-0.5 text-xs text-muted-foreground">{stateLabel}</p></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">Entregas hoje</p><p className="mt-1 text-2xl font-bold">{courier.delivered}</p></div>
            <div className="rounded-lg bg-secondary/60 p-3"><p className="text-xs text-muted-foreground">Em curso</p><p className="mt-1 text-2xl font-bold">{courier.active}</p></div>
          </div>
        </article>;
      })}
      {!courierStats.length && <p className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Ainda não há estafetas autorizados.</p>}
    </section>}

    {tab === "days" && <section aria-label="Resultado das entregas por dia" className="mt-4 space-y-3">
      {historyDays.map((dayKey) => { const day = dailyResults.find((d) => d.day === dayKey) ?? { day: dayKey, deliveries: 0, valueCents: 0, couriers: [] }; const src = dailySources.find((d) => d.day === dayKey); return <article key={day.day} className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><CalendarDays className="h-5 w-5" /></span>
            <div><h2 className="font-semibold capitalize">{formatLisbonDay(day.day)}</h2><p className="mt-0.5 text-xs text-muted-foreground">{day.deliveries} entrega{day.deliveries === 1 ? "" : "s"} · {day.couriers.length} estafeta{day.couriers.length === 1 ? "" : "s"}</p></div>
          </div>
          <span className="text-lg font-bold tabular-nums">{money(day.valueCents / 100)}</span>
        </div>
        <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
          {day.couriers.map((courier) => <li key={courier.id} className="flex items-center justify-between gap-3">
            <span className="truncate">{courier.name}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{courier.deliveries} entrega{courier.deliveries === 1 ? "" : "s"} · {money(courier.valueCents / 100)}</span>
          </li>)}
        </ul>
        {src && <div className="mt-3 border-t border-border pt-3"><p className="text-xs font-semibold text-muted-foreground">Pedidos por origem · {src.orders} pedido{src.orders === 1 ? "" : "s"} · {money(src.valueCents / 100)}</p><div className="mt-2 grid grid-cols-3 gap-2">{src.sources.map((x) => <div key={x.source} className="rounded-lg bg-secondary/60 p-2"><p className="text-xs text-muted-foreground">{orderSourceLabels[x.source]}</p><p className="font-bold tabular-nums">{x.orders}</p><p className="text-xs tabular-nums text-muted-foreground">{money(x.valueCents / 100)}</p></div>)}</div></div>}
      </article>; })}
      {!historyDays.length && <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">Ainda não há entregas concluídas para mostrar.</p>}
    </section>}

    {tab !== "couriers" && tab !== "days" && !list.length && <p className="py-12 text-center text-sm text-muted-foreground">{tab === "open" ? "Sem entregas ativas." : "Sem entregas concluídas."}</p>}
    {tab !== "couriers" && tab !== "days" && <div className="mt-4 grid items-start gap-4 lg:grid-cols-2">{list.map((delivery) => {
      const position = delivery.status === "active" ? data.positions.find((item) => item.delivery_id === delivery.id) ?? null : null;
      const order = data.orders.find((item) => item.id === delivery.order_id);
      const next = nextDeliveryState[delivery.status];
      const mine = data.courier && delivery.courier_id === data.userId;
      const expanded = openId === delivery.id || (tab === "open" && !data.admin) || delivery.status === "active";
      const courierName = data.profiles.find((profile) => profile.id === delivery.courier_id)?.name || "Sem nome";
      return <article key={delivery.id} className={`overflow-hidden rounded-xl border bg-card ${delivery.status === "active" ? "border-primary/50 shadow-md" : "border-border"}`}>
        <button type="button" onClick={() => setOpenId(openId === delivery.id ? null : delivery.id)} className="flex w-full items-start gap-3 p-4 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Bike className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{order ? `Pedido #${orderNumber(order)}` : delivery.reference}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone(delivery.status)}`}>{deliveryLabels[delivery.status]}</span></div>
            <p className="mt-1 truncate text-sm text-muted-foreground">{order?.customer_name ? `${order.customer_name} · ` : ""}{delivery.destination}</p>
            {data.admin && <p className="mt-1 text-xs text-muted-foreground">Estafeta: <span className="font-medium text-foreground">{courierName}</span></p>}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">{order && <span className="font-semibold">{money(order.total_cents / 100)}</span>}<ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} /></div>
        </button>
        {expanded && <div className="space-y-4 border-t border-border p-4">
          <p className="flex gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 text-primary" />{delivery.destination}</p>
          {order && <div className="rounded-lg bg-secondary/60 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{order.customer_name}</p><a className="inline-flex items-center gap-1 text-primary" href={`tel:${order.customer_phone}`}><Phone className="h-3.5 w-3.5" />{order.customer_phone}</a></div>
            <p className="mt-1 text-xs text-muted-foreground">{order.address} · {order.postal_code}</p>
            <ul className="mt-3 space-y-2 border-t border-border pt-3">{order.matturo_order_items.flatMap((item) => Array.from({ length: Math.max(1, item.qty) }, () => item)).map((item, index) => <li key={index}><div className="flex justify-between gap-3"><span>1× {item.name}</span><span>{money(item.line_total_cents / Math.max(1, item.qty) / 100)}</span></div>{Object.entries(item.options as Record<string, string>).map(([key, value]) => <p key={key} className="text-xs text-muted-foreground">{key}: {value}</p>)}</li>)}</ul>
            {order.notes && <p className="mt-3 whitespace-pre-line italic">“{order.notes}”</p>}
            {(mine || data.admin) && <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3"><span className="text-xs font-medium">Cliente pagou com:</span>{paymentMethods.map((method) => <Button key={method} size="sm" variant={paymentFromNotes(order.notes) === method ? "default" : "outline"} disabled={busy || paymentFromNotes(order.notes) === method} onClick={() => run(async () => { await setDeliveryPayment({ data: { id: delivery.id, method } }); toast.success(`Pagamento alterado para ${method}`); })}>{method}</Button>)}</div>}
          </div>}
          {delivery.status === "active" && <div><ClientOnly><Suspense fallback={<div className="h-72 rounded-lg bg-muted" />}><Map lat={delivery.destination_lat} lng={delivery.destination_lng} position={position} /></Suspense></ClientOnly><p className="mt-2 text-xs text-muted-foreground">{position ? `Última atualização: ${new Date(position.recorded_at).toLocaleTimeString("pt-PT")}` : "A aguardar GPS"}</p></div>}
          <div className="flex flex-wrap gap-2">
            {mine && next === "collected" && order && order.status !== "pronto" ? <p className="text-xs text-muted-foreground">Aguarde: o restaurante ainda não colocou este pedido «Em entrega».</p> : mine && next && (next === "active" ? (data.deliveries.some((d) => d.courier_id === data.userId && d.status === "active" && d.id !== delivery.id) ? <p className="text-xs text-muted-foreground">Próxima paragem — finalize a entrega em curso para iniciar esta.</p> : <Button disabled={busy || tracking !== null} onClick={() => start(delivery.id)}><Play />Iniciar entrega e GPS</Button>) : <Button disabled={busy} onClick={() => run(() => changeDelivery({ data: { id: delivery.id, status: next } }))}>{next === "to_restaurant" ? <Bike /> : next === "collected" ? <PackageCheck /> : <Check />}{next === "to_restaurant" ? "A caminho do restaurante" : next === "collected" ? "Pedido recolhido" : "Finalizar entrega"}</Button>)}
            {mine && delivery.status === "active" && tracking !== delivery.id && <Button disabled={busy} variant="outline" onClick={() => start(delivery.id, true)}>Retomar GPS</Button>}
            {!["delivered", "cancelled"].includes(delivery.status) && <><Button asChild size="sm" variant="outline"><a href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.destination_lat},${delivery.destination_lng}&travelmode=driving`} target="_blank" rel="noopener noreferrer"><Navigation />Google Maps</a></Button><Button asChild size="sm" variant="outline"><a href={`https://waze.com/ul?ll=${delivery.destination_lat},${delivery.destination_lng}&navigate=yes`} target="_blank" rel="noopener noreferrer"><Navigation />Waze</a></Button></>}
            {data.admin && !["delivered", "cancelled"].includes(delivery.status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => run(async () => { const result = await issueTrackingLink({ data: { id: delivery.id } }); setLink(`${window.location.origin}/acompanhar/${result.token}`); })}><LinkIcon />Link do cliente</Button>}
          </div>
          <details className="text-xs"><summary className="cursor-pointer text-muted-foreground">Histórico de estados</summary><ol className="mt-2 space-y-1 border-l border-border pl-3">{data.events.filter((event) => event.delivery_id === delivery.id).map((event) => <li key={event.id}>{deliveryLabels[event.status]} · {new Date(event.created_at).toLocaleString("pt-PT")}</li>)}</ol></details>
        </div>}
      </article>;
    })}</div>}
    {data.courier && <p className="mt-8 text-sm text-muted-foreground">A localização é partilhada apenas durante a entrega ativa. Mantenha esta página aberta e o telemóvel desbloqueado.</p>}
  </div>;
}

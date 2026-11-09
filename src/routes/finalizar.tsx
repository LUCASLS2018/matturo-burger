import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Send, ArrowLeft, LocateFixed } from "lucide-react";
import { reverseGeocode } from "@/lib/reverse-geocode.functions";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { claimOrder, placeOrder } from "@/lib/orders.functions";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { money, restaurantHead } from "@/lib/restaurant";
import { orderServices, needsDeliveryAddress } from "@/lib/order-service";
import { publicSettingsQuery } from "@/lib/settings-query";
import { publicSettings } from "@/lib/settings.functions";
import { findZone } from "@/lib/restaurant-settings";
import { supabase } from "@/integrations/supabase/client";
import { canonicalPhone, meetsRewardMinimum, REWARD_MINIMUM_MESSAGE } from "@/lib/loyalty-phone";
import { detectOrderSource } from "@/lib/order-source";
import { CLOSED_ORDER_MESSAGE } from "@/lib/opening-hours";

export const Route = createFileRoute("/finalizar")({
  head: () => restaurantHead("Finalizar pedido", "Confirme e envie o seu pedido diretamente ao Matturo Burger."),
  loader: ({ context }) => context.queryClient.ensureQueryData(publicSettingsQuery),
  component: Checkout,
});

function Checkout() {
  const { items, subtotal, service, setService, clear } = useCart();
  const navigate = useNavigate();
  const submitOrder = useServerFn(placeOrder);
  const claim = useServerFn(claimOrder);
  const checkSettings = useServerFn(publicSettings);
  const { data: settings } = useSuspenseQuery(publicSettingsQuery);
  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const submission = useRef<{ id: string; token: string } | null>(null);
  const delivery = needsDeliveryAddress(service);
  const zone = delivery ? findZone(postal, settings.zones) : null;
  const fee = zone ? zone.fee_cents / 100 : 0;
  const total = subtotal + fee;
  const rewardMinimumMet = meetsRewardMinimum(items.some((item) => item.reward), Math.round(subtotal * 100));

  const [payment, setPayment] = useState<"" | "Multibanco" | "Dinheiro">("");
  const [cash, setCash] = useState("");
  const [locating, setLocating] = useState(false);
  const lookup = useServerFn(reverseGeocode);
  const useLocation = () => {
    if (!navigator.geolocation) { setError("Localização indisponível neste dispositivo."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const result = await lookup({ data: { lat: position.coords.latitude, lng: position.coords.longitude } });
        setAddress(result.address);
        if (result.postal) setPostal(result.postal);
        setPriceChange(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível obter a morada.");
      } finally { setLocating(false); }
    }, () => { setLocating(false); setError("Não foi possível aceder à localização. Autorize a localização ou escreva a morada."); }, { enableHighAccuracy: true, timeout: 15000 });
  };

  const send = async () => {
    if (sending) return;
    if (!rewardMinimumMet) { setError(REWARD_MINIMUM_MESSAGE); return; }
    let normalizedPhone: string;
    try { normalizedPhone = canonicalPhone(phone); } catch { setError("Indique um telemóvel válido."); return; }
    if (!name.trim() || (delivery && (!address.trim() || !zone))) {
      setError(delivery && !zone ? "Indique o seu nome, a morada e um código postal de uma zona de entrega." : "Indique o seu nome, um telemóvel válido e, para delivery, a morada de entrega.");
      return;
    }
    if (!payment) { setError("Escolha a forma de pagamento."); return; }
    const cashValue = Number(cash.replace(",", "."));
    if (payment === "Dinheiro" && (!Number.isFinite(cashValue) || cashValue < (priceChange === null ? total : priceChange / 100))) { setError("Indique com quanto vai pagar (igual ou superior ao total)."); return; }
    const paymentNote = payment === "Dinheiro" ? `Pagamento: Dinheiro — paga com ${money(cashValue)} (troco ${money(cashValue - (priceChange === null ? total : priceChange / 100))})` : "Pagamento: Multibanco";
    const fullNotes = [paymentNote, notes.trim()].filter(Boolean).join("\n").slice(0, 500);
    setSending(true); setError("");
    try {
      const latest = await checkSettings();
      if (latest.paused) { setError("O Matturo está FECHADO temporariamente e não está a aceitar pedidos."); return; }
      if (!latest.isOpen) { setError(CLOSED_ORDER_MESSAGE); return; }
      if (!submission.current) submission.current = { id: crypto.randomUUID(), token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("") };
      const result = await submitOrder({ data: {
        name, phone: normalizedPhone, service, source: detectOrderSource(), address: delivery ? address : undefined, postal: delivery ? postal : undefined, notes: fullNotes,
        expectedTotalCents: Math.round((priceChange ?? total) * 100), acceptRepriced: priceChange !== null,
        submissionId: submission.current.id, accessToken: submission.current.token,
        items: items.map((item) => ({ productId: item.productId, qty: item.qty, options: item.options, selected: item.selected, reward: item.reward })),
      } });
      if (result.kind === "price_changed") { setPriceChange(result.totalCents); return; }
      const { data: session } = await supabase.auth.getSession();
      if (session.session) { try { await claim({ data: { token: result.token } }); } catch { /* The private order link remains available. */ } }
      clear();
      await navigate({ to: "/pedido/$token", params: { token: result.token } });
    } catch (cause) {
      setError(cause instanceof Error && cause.message.length < 180 ? cause.message : "Não foi possível enviar o pedido. Tente novamente.");
    } finally { setSending(false); }
  };

  return <div className="page-width max-w-3xl py-12">
    <Button asChild variant="link" className="mb-6 px-0"><Link to="/carrinho"><ArrowLeft />Voltar ao pedido</Link></Button>
    <h1 className="section-title">Quase à mesa.</h1>
    {!settings.isOpen && <p role="status" className="mt-6 border-l-4 border-destructive bg-destructive/10 p-4 font-semibold text-destructive">{CLOSED_ORDER_MESSAGE}</p>}
    {settings.isOpen && settings.paused && <p role="status" className="mt-6 border-l-4 border-primary bg-secondary p-4">O Matturo está FECHADO temporariamente e não está a aceitar pedidos.</p>}
    {!items.length ? <div className="py-12"><p>O seu pedido está vazio.</p><Button asChild className="mt-5"><Link to="/cardapio">Ver cardápio</Link></Button></div> : <>
      <div className="mt-8 flex flex-wrap gap-3" aria-label="Modalidade do pedido">{orderServices.map((item) => <Button key={item} variant={item === service ? "default" : "outline"} onClick={() => { setService(item); setPriceChange(null); }}>{item}</Button>)}</div>
      <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="mt-8 space-y-6">
        <label className="block text-sm font-medium">O seu nome<input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4" /></label>
        <label className="block text-sm font-medium">Telemóvel<input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" maxLength={30} placeholder="912 345 678" className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4" /></label>
        <Button asChild variant="link" className="px-0"><Link to="/pontos">Os meus pontos · Confirmar telemóvel</Link></Button>
        {delivery && <div className="space-y-4">
          <Button type="button" variant="outline" disabled={locating} onClick={useLocation} className="h-11 w-full sm:w-auto"><LocateFixed />{locating ? "A obter localização…" : "Usar a minha localização atual"}</Button>
          <label className="block text-sm font-medium">Morada de entrega<textarea required value={address} onChange={(event) => setAddress(event.target.value)} autoComplete="street-address" maxLength={250} className="mt-2 w-full rounded-md border border-input bg-card p-4" /></label>
          <label className="block text-sm font-medium">Código postal<input required value={postal} onChange={(event) => { setPostal(event.target.value); setPriceChange(null); }} autoComplete="postal-code" inputMode="numeric" placeholder="0000-000" maxLength={8} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4" /><span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{settings.zones.length ? "Entregamos em " + settings.zones.map((item) => `${item.name} (${item.postal_prefixes.join(", ")})`).join(" e ") + "." : "Ainda não há zonas de entrega ativadas."}</span></label>
        </div>}
        <fieldset className="space-y-3"><legend className="text-sm font-medium">Forma de pagamento</legend>
          <div className="flex flex-wrap gap-3">{(["Multibanco", "Dinheiro"] as const).map((item) => <Button key={item} type="button" aria-pressed={payment === item} variant={payment === item ? "default" : "outline"} onClick={() => setPayment(item)}>{item}</Button>)}</div>
          {payment === "Dinheiro" && <label className="block text-sm font-medium">Com quanto vai pagar? (€)<input required value={cash} onChange={(event) => setCash(event.target.value)} inputMode="decimal" placeholder="Ex.: 20" maxLength={8} className="mt-2 h-12 w-full rounded-md border border-input bg-card px-4" /></label>}
        </fieldset>
        <label className="block text-sm font-medium">Observações (opcional)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={400} rows={3} className="mt-2 w-full rounded-md border border-input bg-card p-4" /></label>
        <ul className="divide-y divide-border border-y border-border">{items.map((item) => <li key={item.key} className="flex justify-between gap-3 py-4 text-sm"><span>{item.qty}× {item.name}</span><span className="shrink-0 font-semibold">{money(item.price * item.qty)}</span></li>)}</ul>
        <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Subtotal dos produtos</span><span className="font-semibold">{money(subtotal)}</span></div>{delivery && <div className="flex justify-between"><span>Entrega{zone ? ` — ${zone.name}` : ""}{zone ? ` (${postal.trim()})` : ""}</span><span className="font-semibold">{zone ? money(fee) : "a confirmar"}</span></div>}<div className="flex justify-between border-t border-border pt-3 text-lg font-semibold"><span>Total</span><span>{money(priceChange === null ? total : priceChange / 100)}</span></div></div>
        {priceChange !== null && <p role="status" className="border-l-4 border-primary bg-secondary p-4 text-sm">O preço ou os portes mudaram. O total atualizado é <strong>{money(priceChange / 100)}</strong>; confirme esse valor para continuar.</p>}
        <p className="text-sm leading-relaxed text-muted-foreground">O pedido chega diretamente ao Matturo. Pagamento no levantamento, na entrega ou à mesa. Vai poder acompanhar o estado numa página privada.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!rewardMinimumMet && <p role="status" className="text-sm text-destructive">{REWARD_MINIMUM_MESSAGE}</p>}
        <Button type="submit" disabled={!settings.isOpen || settings.paused || sending || !rewardMinimumMet} className="h-12 w-full"><Send />{!settings.isOpen || settings.paused ? "FECHADO" : sending ? "A enviar…" : priceChange !== null ? "Confirmar novo total e enviar" : "Enviar pedido"}</Button>
      </form>
    </>}
  </div>;
}

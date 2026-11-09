import { useState } from "react";
import { CircleDot, MapPin, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { saveDeliveryZone, saveStoreDelivery } from "@/lib/settings.functions";
import { money } from "@/lib/restaurant";
import type { Database } from "@/integrations/supabase/types";

type Settings = Database["public"]["Tables"]["matturo_restaurant_settings"]["Row"];
type Zone = Database["public"]["Tables"]["matturo_delivery_zones"]["Row"];
type Props = {
  settings: Settings;
  zones: Zone[];
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
};

const field = "mt-2 h-11 w-full rounded-md border border-input bg-card px-3 text-sm";

export function RadiusDeliverySettings({ settings, zones, busy, run }: Props) {
  const [address, setAddress] = useState(settings.store_address);
  const [mode, setMode] = useState<"postal" | "radius">(settings.delivery_mode === "radius" ? "radius" : "postal");
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");
  const [fee, setFee] = useState("");
  const [editing, setEditing] = useState<string>();
  const radiusZones = zones.filter((zone) => zone.max_distance_km !== null).sort((a, b) => (a.max_distance_km ?? 0) - (b.max_distance_km ?? 0));
  const editZone = radiusZones.find((zone) => zone.id === editing);

  const reset = () => { setEditing(undefined); setName(""); setDistance(""); setFee(""); };

  return <section className="border-b border-border py-10">
    <div className="flex items-center gap-3"><CircleDot className="text-primary" /><h2 className="text-xl font-semibold">Entrega por raio da loja</h2></div>
    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">Calcula a distância em linha reta entre a morada da loja e a morada do cliente. O pedido usa o preço da primeira faixa que cobre essa distância e é recusado fora de todas as faixas.</p>
    <div className="mt-6 flex flex-wrap gap-2" aria-label="Forma de calcular a entrega">
      <Button type="button" variant={mode === "postal" ? "default" : "outline"} aria-pressed={mode === "postal"} onClick={() => setMode("postal")}>Códigos postais</Button>
      <Button type="button" variant={mode === "radius" ? "default" : "outline"} aria-pressed={mode === "radius"} onClick={() => setMode("radius")}>Por raio</Button>
    </div>
    <div className="mt-5 grid items-end gap-4 md:grid-cols-[1fr_auto]">
      <label className="block text-sm font-medium">Morada da loja<div className="relative"><MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><input value={address} onChange={(event) => setAddress(event.target.value)} maxLength={250} className={`${field} pl-10`} /></div></label>
      <Button disabled={busy} onClick={() => void run(() => saveStoreDelivery({ data: { storeAddress: address, deliveryMode: mode, revision: settings.revision } }))}>Guardar morada e modalidade</Button>
    </div>
    {settings.delivery_mode === "radius" && <p className="mt-3 text-xs text-primary">Entrega por raio ativa{settings.store_latitude === null ? "; guarde a morada para confirmar a localização da loja." : "."}</p>}
    {mode === "radius" && <div className="mt-8 rounded-lg border border-border p-5">
      <h3 className="font-semibold">Faixas de distância e preços</h3>
      <p className="mt-2 text-xs text-muted-foreground">Defina os raios e valores reais do Matturo. As faixas ficam inativas até você as ativar.</p>
      <div className="mt-4 divide-y divide-border border-y border-border">{radiusZones.map((zone) => <div key={zone.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><p className="text-sm font-semibold">{zone.name}</p><p className="mt-1 text-xs text-muted-foreground">Até {String(zone.max_distance_km).replace(".", ",")} km · {money(zone.fee_cents / 100)} · {zone.active ? "Ativa" : "Inativa"}</p></div>
        <div className="flex gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={() => { setEditing(zone.id); setName(zone.name); setDistance(String(zone.max_distance_km)); setFee((zone.fee_cents / 100).toFixed(2)); }}><Pencil />Editar</Button><Button size="sm" variant="ghost" disabled={busy} onClick={() => void run(() => saveDeliveryZone({ data: { ...zone, active: !zone.active } }))}>{zone.active ? "Desativar" : "Ativar"}</Button></div>
      </div>)}{!radiusZones.length && <p className="py-6 text-sm text-muted-foreground">Ainda não há faixas de raio configuradas.</p>}</div>
      <form className="mt-6 grid gap-4 md:grid-cols-3" onSubmit={(event) => {
        event.preventDefault();
        const amount = Number(fee.replace(",", "."));
        const maximum = Number(distance.replace(",", "."));
        if (!Number.isFinite(maximum) || maximum <= 0 || maximum > 100 || !Number.isFinite(amount) || amount < 0) return;
        void run(async () => {
          await saveDeliveryZone({ data: { id: editing, revision: editZone?.revision, name, postal_prefixes: [], max_distance_km: maximum, fee_cents: Math.round(amount * 100), active: editZone?.active ?? false } });
          reset();
        });
      }}>
        <label className="text-sm font-medium">Nome da faixa<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Até 3 km" maxLength={100} className={field} /></label>
        <label className="text-sm font-medium">Raio máximo (km)<input required type="number" min="0.1" max="100" step="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} inputMode="decimal" placeholder="3" className={field} /></label>
        <label className="text-sm font-medium">Entrega (€)<input required value={fee} onChange={(event) => setFee(event.target.value)} inputMode="decimal" placeholder="0,00" className={field} /></label>
        <div className="flex gap-3 md:col-span-3"><Button type="submit" disabled={busy}><Plus />{editing ? "Guardar faixa" : "Adicionar faixa"}</Button>{editing && <Button type="button" variant="ghost" onClick={reset}>Cancelar edição</Button>}</div>
      </form>
    </div>}
  </section>;
}

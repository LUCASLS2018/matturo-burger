import { orderNumber } from "@/lib/order-number";
import { useRef, useState } from "react";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Minus, Trash2, Phone, ShoppingBag, Utensils } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { adminMenu } from "@/lib/menu.functions";
import { createManualOrder } from "@/lib/orders.functions";
import { publicSettingsQuery } from "@/lib/settings-query";
import { findZone } from "@/lib/restaurant-settings";
import { orderServices, needsDeliveryAddress, type OrderService } from "@/lib/order-service";
import { dishTotal, selectionValid, type Dish } from "@/lib/menu";
import { money } from "@/lib/restaurant";
import { dishCutout } from "@/lib/dish-images";
import { menuCategoriesQuery } from "@/lib/menu-query";

export const manualMenuQuery = queryOptions({ queryKey: ["matturo-manual-menu"], queryFn: () => adminMenu(), staleTime: 0 });
type Line = { key: string; dish: Dish; selected: Record<string, number>; notes: string };
const fieldClass = "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm";

function ProductPhoto({ dish, className }: { dish: Dish; className: string }) {
  const photo = (dish.image?.startsWith("https://") ? dish.image : null) || dishCutout(dish.slug) || dish.image;
  return <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary ${className}`}>{photo ? <img src={photo} alt={dish.name} loading="lazy" className="h-full w-full object-contain" /> : <Utensils className="h-6 w-6 text-muted-foreground" />}</span>;
}

export function ManualOrder({ onClose }: { onClose: () => void }) {
  const { data: menu } = useSuspenseQuery(manualMenuQuery);
  const { data: settings } = useSuspenseQuery(publicSettingsQuery);
  const { data: categories } = useSuspenseQuery(menuCategoriesQuery);
  const qc = useQueryClient();
  const save = useServerFn(createManualOrder);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postal, setPostal] = useState("");
  const [notes, setNotes] = useState("");
  const [service, setService] = useState<OrderService>("Retirada");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [dishId, setDishId] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [dishNotes, setDishNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changedTotal, setChangedTotal] = useState<number | null>(null);
  const submission = useRef<{ id: string; token: string } | null>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const dish = menu.find((item) => item.id === dishId);
  const delivery = needsDeliveryAddress(service);
  const zone = delivery ? findZone(postal, settings.zones) : null;
  const subtotal = lines.reduce((sum, line) => sum + dishTotal(line.dish, line.selected), 0);
  const fee = zone ? zone.fee_cents / 100 : 0;
  const resetPrice = () => { setChangedTotal(null); };
  const availableMenu = menu.filter((item) => item.visible && item.available);
  const categorySlugs = [...new Set(availableMenu.map((item) => item.category))];
  const visibleCategories = [...categories.filter((item) => categorySlugs.includes(item.slug)).map((item) => ({ slug: item.slug, name: item.name })), ...categorySlugs.filter((slug) => !categories.some((item) => item.slug === slug)).map((slug) => ({ slug, name: slug }))];
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !lines.length || settings.paused || !settings.isOpen) return;
    setBusy(true); setError("");
    try {
      if (!submission.current) submission.current = { id: crypto.randomUUID(), token: Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("") };
      const result = await save({ data: {
        name, phone, service, address: delivery ? address : undefined, postal: delivery ? postal : undefined, notes,
        expectedTotalCents: changedTotal ?? Math.round((subtotal + fee) * 100), acceptRepriced: changedTotal !== null,
        submissionId: submission.current.id, accessToken: submission.current.token,
        items: lines.map((line) => ({ productId: line.dish.id, qty: 1, selected: line.selected, options: line.notes.trim() ? { Observações: line.notes.trim() } : {} })),
      } });
      if (result.kind === "price_changed") { setChangedTotal(result.totalCents); return; }
      await qc.invalidateQueries({ queryKey: ["matturo-admin-orders"] });
      await qc.invalidateQueries({ queryKey: ["matturo-admin-customers"] });
      toast.success(`Pedido #${orderNumber(result)} criado`);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar o pedido."); }
    finally { setBusy(false); }
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
    <DialogContent className="max-h-[92dvh] w-[calc(100%-1rem)] max-w-5xl overflow-y-auto rounded-lg">
      <DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-primary" />Criar pedido manual</DialogTitle>
      <DialogDescription>Pedido por telefone</DialogDescription>
      <form onSubmit={(event) => void submit(event)}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium">Nome do cliente<input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} /></label>
              <label className="text-sm font-medium">Telemóvel<input required type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} /></label>
            </div>
            <div className="flex flex-wrap gap-2">{orderServices.map((value) => <Button type="button" key={value} size="sm" variant={value === service ? "default" : "outline"} onClick={() => { setService(value); resetPrice(); }}>{value}</Button>)}</div>
            {delivery && <div className="space-y-3"><label className="block text-sm font-medium">Morada<input required maxLength={250} value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} /></label><label className="block text-sm font-medium">Código postal<input required maxLength={8} value={postal} onChange={(e) => { setPostal(e.target.value); resetPrice(); }} placeholder="2600-000" className={fieldClass} /></label><p className="text-xs text-muted-foreground">{zone ? `${zone.name} · Entrega ${money(fee)}` : "Selecione um código postal de uma zona de entrega ativa."}</p></div>}
            <label className="block text-sm font-medium">Procurar produto<input value={search} onChange={(e) => setSearch(e.target.value)} className={fieldClass} /></label>
            <div aria-label="Categorias de produtos" className="flex gap-2 overflow-x-auto pb-2"><Button type="button" size="sm" variant={!category ? "default" : "outline"} onClick={() => setCategory("")}>Todas</Button>{visibleCategories.map((item) => <Button type="button" key={item.slug} size="sm" variant={category === item.slug ? "default" : "outline"} onClick={() => setCategory(item.slug)}>{item.name}</Button>)}</div>
            <div ref={productsRef} tabIndex={-1} aria-label="Produtos" className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {visibleCategories.filter((item) => !category || item.slug === category).map((group) => {
                const products = availableMenu.filter((item) => item.category === group.slug && item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
                return products.length ? <section key={group.slug}><h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{group.name}</h3><div className="grid grid-cols-2 gap-2">{products.map((item) => <Button type="button" key={item.id} aria-label={`Selecionar ${item.name}`} aria-pressed={dishId === item.id} variant="outline" className={`h-auto min-w-0 flex-col items-stretch gap-2 whitespace-normal p-2 text-left ${dishId === item.id ? "border-primary bg-primary/5" : ""}`} onClick={() => { setDishId(item.id); setSelected({}); setDishNotes(""); }}><ProductPhoto dish={item} className="h-24 w-full" /><span className="text-xs font-semibold leading-snug">{item.name}</span><span className="text-xs text-primary">{money(item.price)}</span></Button>)}</div></section> : null;
              })}
              {!availableMenu.some((item) => (!category || item.category === category) && item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
            </div>
            {dish && <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-3"><ProductPhoto dish={dish} className="h-16 w-16" /><h3 className="min-w-0 text-sm font-semibold">{dish.name}</h3></div>
              {dish.groups.map((group) => <fieldset key={group.id}><legend className="text-sm font-semibold">{group.name}{group.required && <span className="ml-2 text-xs text-primary">Obrigatório</span>}</legend><div className="mt-2 space-y-2">{group.modifiers.map((modifier) => {
                const count = selected[modifier.id] ?? 0;
                return group.max === 1 ? <label key={modifier.id} className="flex min-h-10 items-center justify-between gap-2 text-sm"><span className="flex items-center gap-2"><input type="radio" name={group.id} checked={count === 1} onChange={() => setSelected((previous) => ({ ...previous, ...Object.fromEntries(group.modifiers.map((option) => [option.id, option.id === modifier.id ? 1 : 0])) }))} />{modifier.name}</span><span className="shrink-0 text-xs text-muted-foreground">{modifier.price ? `+ ${money(modifier.price)}` : "Sem custo"}</span></label> : <div key={modifier.id} className="flex items-center justify-between gap-2 text-sm"><span>{modifier.name}<span className="ml-2 text-xs text-muted-foreground">{money(modifier.price)}</span></span><div className="flex shrink-0 items-center"><Button type="button" variant="ghost" size="icon" aria-label={`Retirar ${modifier.name}`} disabled={!count} onClick={() => setSelected((previous) => ({ ...previous, [modifier.id]: count - 1 }))}><Minus /></Button><span className="w-5 text-center">{count}</span><Button type="button" variant="ghost" size="icon" aria-label={`Adicionar ${modifier.name}`} disabled={count >= modifier.max || group.modifiers.reduce((sum, option) => sum + (selected[option.id] ?? 0), 0) >= group.max} onClick={() => setSelected((previous) => ({ ...previous, [modifier.id]: count + 1 }))}><Plus /></Button></div></div>;
              })}</div></fieldset>)}
              <label className="block text-sm font-medium">Observações do produto<input maxLength={500} value={dishNotes} onChange={(e) => setDishNotes(e.target.value)} className={fieldClass} /></label>
              <Button type="button" disabled={!selectionValid(dish, selected) || lines.length >= 60} onClick={() => { setLines((previous) => [...previous, { key: crypto.randomUUID(), dish, selected: { ...selected }, notes: dishNotes }]); setDishId(""); setSelected({}); setDishNotes(""); resetPrice(); productsRef.current?.focus({ preventScroll: true }); productsRef.current?.scrollIntoView?.({ block: "nearest" }); }}><Plus />Adicionar · {money(dishTotal(dish, selected))}</Button>
            </div>}
          </div>
          <div className="min-w-0 space-y-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h2 className="flex items-center gap-2 font-semibold"><ShoppingBag className="h-4 w-4" />Resumo do pedido <span className="text-muted-foreground">({lines.length})</span></h2>
            {!lines.length && <p className="py-8 text-center text-sm text-muted-foreground">Sem produtos</p>}
            <ul className="divide-y divide-border">{lines.map((line) => <li key={line.key} className="py-3"><div className="flex items-center gap-2"><span className="min-w-0 flex-1 text-sm font-semibold">1× {line.dish.name}</span><span className="shrink-0 text-sm">{money(dishTotal(line.dish, line.selected))}</span><Button type="button" variant="ghost" size="icon" aria-label={`Remover ${line.dish.name}`} onClick={() => { setLines((previous) => previous.filter((item) => item.key !== line.key)); resetPrice(); }}><Trash2 className="h-4 w-4" /></Button></div>{line.dish.groups.map((group) => { const chosen = group.modifiers.filter((modifier) => (line.selected[modifier.id] ?? 0) > 0); return chosen.length ? <p key={group.id} className="text-xs text-muted-foreground">{group.name}: {chosen.map((modifier) => `${line.selected[modifier.id]}× ${modifier.name}`).join(", ")}</p> : null; })}{line.notes && <p className="text-xs italic text-muted-foreground">{line.notes}</p>}</li>)}</ul>
            <label className="block text-sm font-medium">Observações do pedido<textarea rows={3} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} /></label>
            <div className="space-y-2 border-t border-border pt-4 text-sm"><div className="flex justify-between"><span>Produtos</span><span>{money(subtotal)}</span></div>{delivery && <div className="flex justify-between"><span>Entrega</span><span>{zone ? money(fee) : "a confirmar"}</span></div>}<div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(changedTotal === null ? subtotal + fee : changedTotal / 100)}</span></div></div>
            {changedTotal !== null && <p role="status" className="text-sm text-primary">O preço mudou. Confirme o total atualizado para criar o pedido.</p>}
            {!settings.isOpen && <p role="status" className="text-sm text-destructive">O restaurante está FECHADO. Não é possível criar pedidos fora do horário.</p>}
            {settings.isOpen && settings.paused && <p role="status" className="text-sm text-destructive">O restaurante está sem aceitar pedidos.</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy || !lines.length || settings.paused || !settings.isOpen || (delivery && !zone)}><Plus />{busy ? "A guardar…" : changedTotal !== null ? "Confirmar total e criar pedido" : "Criar pedido"}</Button>
            <Button type="button" variant="ghost" className="w-full" disabled={busy} onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
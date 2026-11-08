import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, Check, ImageOff, LoaderCircle, RotateCcw, Search, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminCategories, adminMenu, saveMenuItem } from "@/lib/menu.functions";
import { menuQuery } from "@/lib/menu-query";
import type { EditableDish } from "@/lib/menu";
import { OptionsEditor } from "@/components/restaurant/OptionsEditor";
import { money, restaurantHead } from "@/lib/restaurant";
import { supabase } from "@/integrations/supabase/client";

const adminMenuQuery = queryOptions({ queryKey: ["matturo-admin-menu"], queryFn: () => adminMenu() });
const adminCategoriesQuery = queryOptions({ queryKey: ["matturo-admin-categories"], queryFn: () => adminCategories() });

type Draft = { name: string; description: string; price: string; category: string; position: number; available: boolean; visible: boolean; imagePath: string | null };
type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const toDraft = (dish: EditableDish): Draft => ({
  name: dish.name,
  description: dish.description,
  price: dish.price.toFixed(2),
  category: dish.category,
  position: dish.position,
  available: dish.available,
  visible: dish.visible,
  imagePath: dish.imagePath,
});

const sameDraft = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

export const Route = createFileRoute("/_authenticated/gerir-menu")({
  head: () => restaurantHead("Editar produtos", "Área privada para editar os produtos, preços e fotografias do Matturo Burger."),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(adminMenuQuery), context.queryClient.ensureQueryData(adminCategoriesQuery)]),
  component: MenuAdminPage,
  errorComponent: () => <div className="page-width py-16"><h1 className="section-title">Produtos indisponíveis</h1><p className="mt-4 text-muted-foreground">Esta área exige acesso de administrador.</p><Button asChild className="mt-6"><Link to="/painel">Voltar ao painel</Link></Button></div>,
});

function MenuAdminPage() {
  const { data } = useSuspenseQuery(adminMenuQuery);
  const { data: categoryOptions } = useSuspenseQuery(adminCategoriesQuery);
  const queryClient = useQueryClient();
  const save = useServerFn(saveMenuItem);
  const [selectedId, setSelectedId] = useState(data[0]?.id ?? "");
  const selected = data.find((dish) => dish.id === selectedId) ?? data[0];
  const [draft, setDraft] = useState<Draft | null>(selected ? toDraft(selected) : null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const [localPhoto, setLocalPhoto] = useState("");
  const sequence = useRef(0);
  const revision = useRef(selected?.revision ?? 1);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const dirty = state === "pending" || state === "saving" || state === "error";

  useEffect(() => {
    if (!draft || !selected) return;
    if (sameDraft(draft, toDraft(selected))) { setState("idle"); setError(""); return; }
    const currentSequence = ++sequence.current;
    setState("pending");
    setError("");
    const timer = window.setTimeout(() => {
      chain.current = chain.current.catch(() => undefined).then(async () => {
        if (currentSequence !== sequence.current) return;
        const amount = Number(draft.price.replace(",", "."));
        if (!draft.name.trim() || !Number.isFinite(amount) || amount < 0 || amount > 1000) {
          setState("error");
          setError("Indique um nome e um preço entre 0,00 € e 1000,00 €.");
          return;
        }
        setState("saving");
        try {
          const saved = await save({ data: {
            id: selected.id,
            revision: revision.current,
            name: draft.name,
            description: draft.description,
            category: draft.category,
            position: draft.position,
            price_cents: Math.round(amount * 100),
            available: draft.available,
            visible: draft.visible,
            imagePath: draft.imagePath,
          } });
          revision.current = saved.revision;
          queryClient.setQueryData<EditableDish[]>(adminMenuQuery.queryKey, (old) => old?.map((dish) => dish.id === saved.id ? saved : dish));
          void queryClient.invalidateQueries({ queryKey: menuQuery.queryKey });
          if (currentSequence === sequence.current) setState("saved");
        } catch (cause) {
          if (currentSequence === sequence.current) {
            setState("error");
            setError(cause instanceof Error ? cause.message : "Não foi possível guardar. Tente novamente.");
          }
        }
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [draft, selected?.id, save, queryClient]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function choose(dish: EditableDish) {
    if (dish.id === selected?.id) return;
    if (dirty && !window.confirm("Há alterações por guardar. Quer sair deste produto mesmo assim?")) return;
    sequence.current += 1;
    setSelectedId(dish.id);
    revision.current = dish.revision;
    setDraft(toDraft(dish));
    setLocalPhoto("");
    setState("idle");
    setError("");
  }

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((old) => old ? { ...old, [key]: value } : old);
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file || !selected || !draft) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError("Use uma fotografia JPG, PNG ou WebP."); setState("error"); return; }
    if (file.size > 5 * 1024 * 1024) { setError("A fotografia deve ter até 5 MB."); setState("error"); return; }
    setPhotoBusy(true);
    setError("");
    try {
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${selected.id}/${crypto.randomUUID()}.${extension}`;
      const uploaded = await supabase.storage.from("matturo-menu-images").upload(path, file);
      if (uploaded.error) throw uploaded.error;
      setLocalPhoto(URL.createObjectURL(file));
      update("imagePath", path);
    } catch {
      setState("error");
      setError("Não foi possível enviar a fotografia. Tente novamente.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const filtered = data.filter((dish) => dish.name.toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt")));
  const statusText = state === "pending" ? "Alterações por guardar…" : state === "saving" ? "A guardar…" : state === "saved" ? "Guardado" : "";

  return <div className="page-width py-10">
    <Link to="/painel" onClick={(event) => { if (dirty && !window.confirm("Há alterações por guardar. Quer sair mesmo assim?")) event.preventDefault(); }} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />Painel da equipa</Link>
    <p className="mb-3 text-xs font-semibold text-primary">MATTURO · ADMINISTRAÇÃO</p>
    <h1 className="section-title">Produtos</h1>
    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Edite nomes, preços, descrições, categorias, opções, disponibilidade e fotografias. As alterações são guardadas automaticamente.</p>
    <Button asChild variant="outline" className="mt-5"><Link to="/categorias">Gerir categorias</Link></Button>
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-lg border border-border bg-card p-4 lg:sticky lg:top-28">
        <label className="relative block"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar produto" aria-label="Procurar produto" className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm" /></label>
        <div className="mt-4 max-h-[65vh] space-y-1 overflow-y-auto pr-1">
          {filtered.map((dish) => <button key={dish.id} type="button" onClick={() => choose(dish)} className={`w-full rounded-md px-3 py-3 text-left text-sm ${dish.id === selected?.id ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-accent"}`}>
            <span className="block">{dish.name}</span><span className={`mt-1 block text-xs ${dish.id === selected?.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{money(dish.price)} · {dish.available ? "Disponível" : "Indisponível"}</span>
          </button>)}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{data.length} produtos</p>
      </aside>
      {selected && draft ? <section aria-label={`Editar ${selected.name}`} className="rounded-lg border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5"><div><h2 className="text-xl font-semibold">Editar produto</h2><p className="mt-1 text-xs text-muted-foreground">Revisão {revision.current}</p></div><div aria-live="polite" className="flex items-center gap-2 text-sm">{state === "saved" && <Check className="h-4 w-4 text-primary" />}{(state === "pending" || state === "saving") && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}<span className={state === "saved" ? "font-semibold text-primary" : "text-muted-foreground"}>{statusText}</span></div></div>
        <div className="mt-6 grid gap-7 md:grid-cols-[220px_1fr]">
          <div><div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted">{(localPhoto || selected.image) ? <img src={localPhoto || selected.image || undefined} alt={selected.name} className="h-full w-full object-contain" /> : <Utensils className="h-12 w-12 text-muted-foreground" />}</div>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-semibold"><Camera className="h-4 w-4" />{photoBusy ? "A enviar…" : "Mudar fotografia"}<input type="file" disabled={photoBusy} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadPhoto(event.target.files?.[0])} /></label>
            {draft.imagePath && <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => { setLocalPhoto(""); update("imagePath", null); }}><ImageOff />Sem fotografia</Button>}
            <p className="mt-3 text-center text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB</p>
          </div>
          <div className="space-y-5"><label className="block text-sm font-medium">Nome<input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={120} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm" /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Preço (€)<input value={draft.price} onChange={(event) => update("price", event.target.value)} inputMode="decimal" className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm" /></label><label className="block text-sm font-medium">Ordem no cardápio<input type="number" min={0} value={draft.position} onChange={(event) => update("position", Number(event.target.value))} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm" /></label></div>
            <label className="block text-sm font-medium">Categoria<select value={draft.category} onChange={(event) => update("category", event.target.value)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">{categoryOptions.map((category) => <option key={category.id} value={category.slug}>{category.name}{category.active ? "" : " (inativa)"}</option>)}</select></label>
            <label className="block text-sm font-medium">Descrição<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} rows={6} className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm" /></label>
            <div className="space-y-3 border-t border-border pt-5"><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.available} onChange={(event) => update("available", event.target.checked)} className="h-4 w-4 accent-primary" />Disponível para pedidos</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft.visible} onChange={(event) => update("visible", event.target.checked)} className="h-4 w-4 accent-primary" />Visível no cardápio</label></div>
          </div>
        </div>
        {state === "error" && <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" onClick={() => setDraft({ ...draft })}><RotateCcw />Tentar guardar novamente</Button></div>}
        <OptionsEditor dish={selected} adminQueryKey={adminMenuQuery.queryKey} />
      </section> : <p>Nenhum produto encontrado.</p>}
    </div>
  </div>;
}

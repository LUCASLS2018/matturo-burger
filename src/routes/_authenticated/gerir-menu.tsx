import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Check, ImageOff, LayoutDashboard, LayoutGrid, LoaderCircle, Plus, Receipt, RotateCcw, Search, Settings, Upload, Users, Utensils } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { adminCategories, adminMenu, createMenuItem, deleteMenuItem, saveMenuItem } from "@/lib/menu.functions";
import { menuQuery } from "@/lib/menu-query";
import type { EditableDish } from "@/lib/menu";
import { OptionsEditor } from "@/components/restaurant/OptionsEditor";
import { money, restaurantHead } from "@/lib/restaurant";
import { supabase } from "@/integrations/supabase/client";

const adminMenuQuery = queryOptions({ queryKey: ["matturo-admin-menu"], queryFn: () => adminMenu() });
const adminCategoriesQuery = queryOptions({ queryKey: ["matturo-admin-categories"], queryFn: () => adminCategories() });

type Draft = { name: string; slug: string; description: string; price: string; category: string; position: number; available: boolean; visible: boolean; imagePath: string | null };
type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const toDraft = (dish: EditableDish): Draft => ({
  name: dish.name,
  slug: dish.slug,
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
  const create = useServerFn(createMenuItem);
  const remove = useServerFn(deleteMenuItem);
  const [selectedId, setSelectedId] = useState(data[0]?.id ?? "");
  const selected = data.find((dish) => dish.id === selectedId) ?? data[0];
  const [draft, setDraft] = useState<Draft | null>(selected ? toDraft(selected) : null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [open, setOpen] = useState(false);
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
        if (!draft.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) || !Number.isFinite(amount) || amount < 0 || amount > 1000) {
          setState("error");
          setError("Indique nome, endereço válido e preço entre 0,00 € e 1000,00 €.");
          return;
        }
        setState("saving");
        try {
          const saved = await save({ data: {
            id: selected.id,
            revision: revision.current,
            name: draft.name,
            slug: draft.slug,
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

  async function addProduct() {
    if (dirty && !window.confirm("Há alterações por guardar. Quer continuar mesmo assim?")) return;
    const name = window.prompt("Nome do novo produto")?.trim();
    if (!name) return;
    const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    try {
      const created = await create({ data: { name, slug, description: "", category: categoryOptions[0]?.slug ?? "", position: data.length, price_cents: 0 } });
      queryClient.setQueryData<EditableDish[]>(adminMenuQuery.queryKey, (old) => [...(old ?? []), created]);
      setSelectedId(created.id); revision.current = created.revision; setDraft(toDraft(created)); setState("idle"); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar o produto."); }
  }

  async function removeProduct() {
    if (!selected || !window.confirm(`Eliminar ${selected.name}? Os pedidos antigos mantêm o registo do produto.`)) return;
    try {
      await remove({ data: { id: selected.id } });
      const remaining = data.filter((dish) => dish.id !== selected.id);
      queryClient.setQueryData(adminMenuQuery.queryKey, remaining);
      void queryClient.invalidateQueries({ queryKey: menuQuery.queryKey });
      const next = remaining[0]; setSelectedId(next?.id ?? ""); setDraft(next ? toDraft(next) : null); revision.current = next?.revision ?? 1; setState("idle");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível eliminar."); }
  }

  async function quickToggle(dish: EditableDish, visible: boolean) {
    if (dish.id === selected?.id && draft) { update("visible", visible); return; }
    try {
      const saved = await save({ data: { id: dish.id, revision: dish.revision, name: dish.name, slug: dish.slug, description: dish.description, category: dish.category, position: dish.position, price_cents: Math.round(dish.price * 100), available: dish.available, visible, imagePath: dish.imagePath } });
      queryClient.setQueryData<EditableDish[]>(adminMenuQuery.queryKey, (old) => old?.map((item) => item.id === saved.id ? saved : item));
      void queryClient.invalidateQueries({ queryKey: menuQuery.queryKey });
    } catch (cause) { window.alert(cause instanceof Error ? cause.message : "Não foi possível alterar."); }
  }

  const filtered = data.filter((dish) => (category === "all" || dish.category === category) && dish.name.toLocaleLowerCase("pt").includes(query.toLocaleLowerCase("pt")));
  const statusText = state === "pending" ? "Alterações por guardar…" : state === "saving" ? "A guardar…" : state === "saved" ? "Guardado" : "";
  const guard = (event: { preventDefault: () => void }) => { if (dirty && !window.confirm("Há alterações por guardar. Quer sair mesmo assim?")) event.preventDefault(); };
  const rail = [
    { to: "/painel", icon: LayoutDashboard, label: "Painel" },
    { to: "/gerir-menu", icon: LayoutGrid, label: "Produtos", active: true },
    { to: "/pedidos", icon: Receipt, label: "Pedidos" },
    { to: "/clientes", icon: Users, label: "Clientes" },
    { to: "/configuracoes", icon: Settings, label: "Configurações" },
  ] as const;
  const input = "mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

  return <div className="flex min-h-[calc(100vh-5rem)] bg-muted/40">
    <nav aria-label="Administração" className="sticky top-0 hidden h-[calc(100vh-5rem)] w-16 shrink-0 flex-col items-center gap-3 bg-foreground py-5 md:flex">
      {rail.map((item) => <Link key={item.to} to={item.to} onClick={guard} title={item.label} aria-label={item.label} className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${"active" in item ? "bg-primary text-primary-foreground" : "text-background/60 hover:bg-background/10 hover:text-background"}`}><item.icon className="h-5 w-5" /></Link>)}
    </nav>
    <aside className="hidden w-56 shrink-0 border-r border-border bg-card p-5 lg:block">
      <p className="text-lg font-bold">Matturo · Menu</p>
      <p className="mt-6 text-sm font-semibold">Categorias</p>
      <div className="mt-3 space-y-1">
        {[{ slug: "all", name: "Todos" }, ...categoryOptions].map((cat) => <button key={cat.slug} type="button" onClick={() => setCategory(cat.slug)} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${category === cat.slug ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}>{cat.name}</button>)}
      </div>
      <Button asChild variant="outline" size="sm" className="mt-6 w-full"><Link to="/categorias" onClick={guard}>Gerir categorias</Link></Button>
    </aside>
    <main className="min-w-0 flex-1 p-5 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Produtos</h1><p className="text-sm text-muted-foreground">{filtered.length} de {data.length} produtos · guardado automaticamente</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Procurar produto" aria-label="Procurar produto" className="h-10 w-56 rounded-lg border border-input bg-card pl-9 pr-3 text-sm" /></label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Categoria" className="h-10 rounded-lg border border-input bg-card px-3 text-sm lg:hidden"><option value="all">Todas</option>{categoryOptions.map((cat) => <option key={cat.id} value={cat.slug}>{cat.name}</option>)}</select>
          <Button type="button" onClick={() => void addProduct().then(() => setOpen(true))}><Plus />Criar produto</Button>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {filtered.map((dish) => {
          const isSel = open && dish.id === selected?.id;
          const visible = dish.id === selected?.id && draft ? draft.visible : dish.visible;
          return <div key={dish.id} className={`group overflow-hidden rounded-xl border bg-card p-3 shadow-sm transition hover:shadow-md ${isSel ? "border-primary ring-2 ring-primary/30" : "border-border"}`}>
            <button type="button" onClick={() => { choose(dish); setOpen(true); }} className="block w-full text-left">
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-muted">{dish.image ? <img src={dish.image} alt={dish.name} loading="lazy" className="h-full w-full object-contain transition group-hover:scale-105" /> : <Utensils className="h-10 w-10 text-muted-foreground" />}</div>
              <p className="mt-3 truncate font-semibold">{dish.name}</p>
              <p className="text-sm font-semibold text-primary">{money(dish.price)}</p>
            </button>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground"><span>{visible ? "Publicado" : "Oculto"}{dish.available ? "" : " · Esgotado"}</span><Switch checked={visible} onCheckedChange={(value) => void quickToggle(dish, value)} aria-label={`Publicar ${dish.name}`} /></div>
          </div>;
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum produto encontrado.</p>}
      </div>
    </main>
    <Sheet open={open && !!selected && !!draft} onOpenChange={(value) => { if (!value && dirty && !window.confirm("Há alterações por guardar. Fechar mesmo assim?")) return; setOpen(value); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {selected && draft && <>
          <SheetHeader><p className="text-xs text-muted-foreground">Editar produto</p><SheetTitle className="text-xl">{draft.name || selected.name}</SheetTitle>
            <div aria-live="polite" className="flex items-center gap-2 text-sm">{state === "saved" && <Check className="h-4 w-4 text-primary" />}{(state === "pending" || state === "saving") && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}<span className={state === "saved" ? "font-semibold text-primary" : "text-muted-foreground"}>{statusText}</span></div>
          </SheetHeader>
          <div className="mt-6 space-y-5">
            <label className="block text-sm font-medium">Nome<input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={120} className={input} /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Preço (€)<input value={draft.price} onChange={(event) => update("price", event.target.value)} inputMode="decimal" className={input} /></label><label className="block text-sm font-medium">Ordem<input type="number" min={0} value={draft.position} onChange={(event) => update("position", Number(event.target.value))} className={input} /></label></div>
            <label className="block text-sm font-medium">Categoria<select value={draft.category} onChange={(event) => update("category", event.target.value)} className={input}>{categoryOptions.map((cat) => <option key={cat.id} value={cat.slug}>{cat.name}{cat.active ? "" : " (inativa)"}</option>)}</select></label>
            <label className="block text-sm font-medium">Descrição<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} rows={4} className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none" /></label>
            <div><p className="text-sm font-medium">Imagem</p>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/40 p-4 text-center hover:border-primary">
                {(localPhoto || selected.image) ? <img src={localPhoto || selected.image || undefined} alt={selected.name} className="h-32 object-contain" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                <span className="text-sm font-semibold">{photoBusy ? "A enviar…" : "Enviar fotografia"}</span><span className="text-xs text-muted-foreground">JPG, PNG ou WebP · até 5 MB</span>
                <input type="file" disabled={photoBusy} accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadPhoto(event.target.files?.[0])} />
              </label>
              {draft.imagePath && <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => { setLocalPhoto(""); update("imagePath", null); }}><ImageOff />Sem fotografia</Button>}
            </div>
            <label className="block text-sm font-medium">Endereço do produto (slug)<input value={draft.slug} onChange={(event) => update("slug", event.target.value.toLowerCase())} maxLength={120} className={input} /></label>
            <div className="space-y-3 rounded-lg border border-border p-4"><label className="flex items-center justify-between text-sm">Disponível para pedidos<Switch checked={draft.available} onCheckedChange={(value) => update("available", value)} /></label><label className="flex items-center justify-between text-sm">Visível no cardápio<Switch checked={draft.visible} onCheckedChange={(value) => update("visible", value)} /></label></div>
            {state === "error" && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3"><p className="text-sm text-destructive">{error}</p><Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setDraft({ ...draft })}><RotateCcw />Tentar novamente</Button></div>}
            <OptionsEditor dish={selected} adminQueryKey={adminMenuQuery.queryKey} />
            <div className="flex gap-3 border-t border-border pt-5"><Button type="button" className="flex-1" onClick={() => { setDraft({ ...draft }); if (!dirty) setOpen(false); }}>Guardar alterações</Button><Button type="button" variant="outline" className="flex-1" onClick={() => { setDraft(toDraft(selected)); setLocalPhoto(""); setOpen(false); }}>Cancelar</Button></div>
            <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => void removeProduct().then(() => setOpen(false))}>Eliminar produto</Button>
          </div>
        </>}
      </SheetContent>
    </Sheet>
  </div>;
}

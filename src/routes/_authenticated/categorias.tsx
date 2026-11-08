import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminCategories, createCategory, saveCategory } from "@/lib/menu.functions";
import { menuCategoriesQuery } from "@/lib/menu-query";
import { restaurantHead } from "@/lib/restaurant";
import type { MenuCategory } from "@/lib/menu";

const categoriesQuery = queryOptions({ queryKey: ["matturo-admin-categories"], queryFn: () => adminCategories() });
export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => restaurantHead("Categorias", "Gestão privada das categorias do cardápio Matturo Burger."),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQuery),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data } = useSuspenseQuery(categoriesQuery);
  const queryClient = useQueryClient();
  const save = useServerFn(saveCategory);
  const create = useServerFn(createCategory);
  const [drafts, setDrafts] = useState<MenuCategory[]>(data);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const baseline = useRef(JSON.stringify(data));
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  useEffect(() => { setDrafts(data); baseline.current = JSON.stringify(data); }, [data]);
  useEffect(() => {
    if (JSON.stringify(drafts) === baseline.current) return;
    setState("pending");
    const timer = window.setTimeout(() => void (async () => {
      setState("saving"); setError("");
      try {
        const original = JSON.parse(baseline.current) as MenuCategory[];
        for (const category of draftsRef.current) {
          const before = original.find((item) => item.id === category.id);
          if (!before || JSON.stringify(before) === JSON.stringify(category)) continue;
          await save({ data: { id: category.id, revision: before.revision, name: category.name, slug: category.slug, position: category.position, active: category.active } });
        }
        await Promise.all([queryClient.invalidateQueries({ queryKey: categoriesQuery.queryKey }), queryClient.invalidateQueries({ queryKey: menuCategoriesQuery.queryKey })]);
        setState("saved");
      } catch (cause) { setState("error"); setError(cause instanceof Error ? cause.message : "Não foi possível guardar."); }
    })(), 800);
    return () => window.clearTimeout(timer);
  }, [drafts, save, queryClient]);

  const update = (id: string, patch: Partial<MenuCategory>) => setDrafts((current) => current.map((category) => category.id === id ? { ...category, ...patch } : category));
  return <div className="page-width py-10">
    <Link to="/gerir-menu" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" />Voltar aos produtos</Link>
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-3 text-xs font-semibold text-primary">MATTURO · ADMINISTRAÇÃO</p><h1 className="section-title">Categorias</h1><p className="mt-3 text-sm text-muted-foreground">Altere nomes, ordem e visibilidade. As mudanças são guardadas automaticamente.</p></div><p aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">{(state === "pending" || state === "saving") && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}{state === "pending" ? "Alterações por guardar…" : state === "saving" ? "A guardar…" : state === "saved" ? "Guardado" : ""}</p></div>
    <div className="mt-8 space-y-4">{drafts.map((category) => <section key={category.id} className="grid items-end gap-4 rounded-lg border border-border bg-card p-5 md:grid-cols-[2fr_2fr_1fr_auto]">
      <label className="text-sm">Nome<input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" value={category.name} onChange={(event) => update(category.id, { name: event.target.value })} /></label>
      <label className="text-sm">Endereço (slug)<input className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" value={category.slug} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" onChange={(event) => update(category.id, { slug: event.target.value.toLowerCase() })} /></label>
      <label className="text-sm">Ordem<input type="number" min={0} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" value={category.position} onChange={(event) => update(category.id, { position: Number(event.target.value) })} /></label>
      <label className="flex h-11 items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={category.active} onChange={(event) => update(category.id, { active: event.target.checked })} />Ativa</label>
    </section>)}</div>
    {error && <p role="alert" className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    <form className="mt-8 flex flex-wrap items-end gap-3 border-t border-border pt-7" onSubmit={(event) => { event.preventDefault(); const slug = newName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); if (!slug) { setError("Indique um nome válido."); return; } void create({ data: { name: newName.trim(), slug, position: drafts.length, active: true } }).then(async () => { setNewName(""); await Promise.all([queryClient.invalidateQueries({ queryKey: categoriesQuery.queryKey }), queryClient.invalidateQueries({ queryKey: menuCategoriesQuery.queryKey })]); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível criar.")); }}>
      <label className="min-w-56 flex-1 text-sm">Nova categoria<input required className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3" value={newName} onChange={(event) => setNewName(event.target.value)} /></label>
      <Button type="submit" className="h-11"><Plus />Criar categoria</Button>
    </form>
  </div>;
}

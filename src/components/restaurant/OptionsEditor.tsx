import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LoaderCircle, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addModifier, addModifierGroup, deleteModifier, deleteModifierGroup, saveModifier, saveModifierGroup } from "@/lib/menu.functions";
import { menuQuery } from "@/lib/menu-query";
import type { EditableDish, ModifierGroup } from "@/lib/menu";

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";
const copyGroups = (groups: ModifierGroup[]) => JSON.parse(JSON.stringify(groups)) as ModifierGroup[];

export function OptionsEditor({ dish, adminQueryKey }: { dish: EditableDish; adminQueryKey: readonly unknown[] }) {
  const queryClient = useQueryClient();
  const saveGroup = useServerFn(saveModifierGroup);
  const saveOption = useServerFn(saveModifier);
  const createGroup = useServerFn(addModifierGroup);
  const createOption = useServerFn(addModifier);
  const removeGroup = useServerFn(deleteModifierGroup);
  const removeOption = useServerFn(deleteModifier);
  const [groups, setGroups] = useState(() => copyGroups(dish.groups));
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const baseline = useRef(JSON.stringify(dish.groups));
  const revisions = useRef(new Map<string, number>());
  const groupsRef = useRef(groups);
  groupsRef.current = groups;

  useEffect(() => {
    const next = copyGroups(dish.groups);
    baseline.current = JSON.stringify(next);
    revisions.current = new Map(next.flatMap((group) => [[group.id, group.revision ?? 1] as const, ...group.modifiers.map((modifier) => [modifier.id, modifier.revision ?? 1] as const)]));
    setGroups(next);
    setState("idle");
  }, [dish.id, dish.groups]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKey }),
      queryClient.invalidateQueries({ queryKey: menuQuery.queryKey }),
    ]);
  };

  useEffect(() => {
    const serialized = JSON.stringify(groups);
    if (serialized === baseline.current) return;
    setState("pending");
    const timer = window.setTimeout(() => {
      void (async () => {
        setState("saving");
        setError("");
        try {
          const original = JSON.parse(baseline.current) as ModifierGroup[];
          for (const group of groupsRef.current) {
            const before = original.find((item) => item.id === group.id);
            if (!before) continue;
            const groupChanged = JSON.stringify({ ...before, modifiers: [] }) !== JSON.stringify({ ...group, modifiers: [] });
            if (groupChanged) {
              const saved = await saveGroup({ data: { itemId: dish.id, id: group.id, revision: revisions.current.get(group.id) ?? 1, name: group.name, required: group.required, min: group.min, max: group.max, position: group.position ?? 0 } });
              revisions.current.set(group.id, saved.revision);
            }
            for (const modifier of group.modifiers) {
              const previous = before.modifiers.find((item) => item.id === modifier.id);
              if (!previous || JSON.stringify(previous) === JSON.stringify(modifier)) continue;
              const saved = await saveOption({ data: { itemId: dish.id, groupId: group.id, id: modifier.id, revision: revisions.current.get(modifier.id) ?? 1, name: modifier.name, price_cents: Math.round(modifier.price * 100), max: modifier.max, position: modifier.position ?? 0 } });
              revisions.current.set(modifier.id, saved.revision);
            }
          }
          baseline.current = JSON.stringify(groupsRef.current);
          setState("saved");
          await refresh();
        } catch (cause) {
          setState("error");
          setError(cause instanceof Error ? cause.message : "Não foi possível guardar as opções.");
        }
      })();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [groups, dish.id, saveGroup, saveOption]);

  function updateGroup(id: string, patch: Partial<ModifierGroup>) {
    setGroups((current) => current.map((group) => group.id === id ? { ...group, ...patch } : group));
  }

  async function addGroup() {
    try {
      await createGroup({ data: { itemId: dish.id, name: "Novo grupo", required: false, min: 0, max: 1, position: groups.length } });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar o grupo."); }
  }

  async function addOption(groupId: string) {
    const group = groups.find((item) => item.id === groupId);
    if (!group) return;
    try {
      await createOption({ data: { itemId: dish.id, groupId, name: "Nova opção", price_cents: 0, max: 1, position: group.modifiers.length } });
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a opção."); }
  }

  const busy = state === "saving";
  return <section className="mt-8 border-t border-border pt-7" aria-label="Opções do produto">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-lg font-semibold">Grupos e opções</h3><p className="mt-1 text-xs text-muted-foreground">Nomes, preços, limites e ordem usados nos novos pedidos.</p></div>
      <div aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">{(state === "pending" || busy) && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}{state === "pending" ? "Alterações por guardar…" : busy ? "A guardar…" : state === "saved" ? "Opções guardadas" : ""}</div>
    </div>
    <div className="mt-5 space-y-5">{groups.map((group, groupIndex) => <fieldset key={group.id} className="rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-semibold">Grupo {groupIndex + 1}</legend>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs lg:col-span-2">Nome<input className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={group.name} onChange={(event) => updateGroup(group.id, { name: event.target.value })} /></label>
        <label className="text-xs">Mínimo<input type="number" min={0} max={100} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={group.min} onChange={(event) => updateGroup(group.id, { min: Number(event.target.value) })} /></label>
        <label className="text-xs">Máximo<input type="number" min={1} max={100} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={group.max} onChange={(event) => updateGroup(group.id, { max: Number(event.target.value) })} /></label>
        <label className="text-xs">Ordem<input type="number" min={0} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={group.position ?? groupIndex} onChange={(event) => updateGroup(group.id, { position: Number(event.target.value) })} /></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-primary" checked={group.required} onChange={(event) => updateGroup(group.id, { required: event.target.checked })} />Obrigatório</label><Button type="button" size="sm" variant="ghost" onClick={() => { if (window.confirm("Eliminar este grupo e todas as opções? Os pedidos antigos não mudam.")) void removeGroup({ data: { itemId: dish.id, id: group.id } }).then(refresh).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível eliminar.")); }}><Trash2 />Eliminar grupo</Button></div>
      <div className="mt-4 space-y-3">{group.modifiers.map((modifier, modifierIndex) => <div key={modifier.id} className="grid items-end gap-3 rounded-md bg-secondary/50 p-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="text-xs">Opção<input className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={modifier.name} onChange={(event) => updateGroup(group.id, { modifiers: group.modifiers.map((item) => item.id === modifier.id ? { ...item, name: event.target.value } : item) })} /></label>
        <label className="text-xs">Preço (€)<input inputMode="decimal" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={modifier.price.toFixed(2)} onChange={(event) => updateGroup(group.id, { modifiers: group.modifiers.map((item) => item.id === modifier.id ? { ...item, price: Number(event.target.value.replace(",", ".")) || 0 } : item) })} /></label>
        <label className="text-xs">Máx./cliente<input type="number" min={1} max={100} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={modifier.max} onChange={(event) => updateGroup(group.id, { modifiers: group.modifiers.map((item) => item.id === modifier.id ? { ...item, max: Number(event.target.value) } : item) })} /></label>
        <label className="text-xs">Ordem<input type="number" min={0} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={modifier.position ?? modifierIndex} onChange={(event) => updateGroup(group.id, { modifiers: group.modifiers.map((item) => item.id === modifier.id ? { ...item, position: Number(event.target.value) } : item) })} /></label>
        <Button type="button" size="icon" variant="ghost" aria-label={`Eliminar ${modifier.name}`} onClick={() => { if (window.confirm("Eliminar esta opção? Os pedidos antigos não mudam.")) void removeOption({ data: { itemId: dish.id, groupId: group.id, id: modifier.id } }).then(refresh).catch((cause) => setError(cause instanceof Error ? cause.message : "Não foi possível eliminar.")); }}><Trash2 /></Button>
      </div>)}</div>
      <Button type="button" size="sm" variant="outline" className="mt-4" onClick={() => void addOption(group.id)}><Plus />Adicionar opção</Button>
    </fieldset>)}</div>
    {error && <div role="alert" className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4"><p className="text-sm text-destructive">{error}</p><Button type="button" size="sm" variant="outline" onClick={() => setGroups(copyGroups(groupsRef.current))}><RotateCcw />Tentar novamente</Button></div>}
    <Button type="button" variant="outline" className="mt-5" onClick={() => void addGroup()}><Plus />Adicionar grupo</Button>
  </section>;
}

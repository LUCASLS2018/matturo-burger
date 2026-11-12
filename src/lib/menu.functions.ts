import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { composeModifierGroups, menuItemToDish, type Dish, type EditableDish, type MenuItemRecord, type ModifierGroupRecord, type ModifierRecord } from "./menu";

const fields = "id,name,slug,description,category,price_cents,discount_percent,image,available,visible,revision,position" as const;
const groupFields = "item_id,id,name,required,min,max,position,revision" as const;
const modifierFields = "item_id,group_id,id,name,price_cents,max,position,revision" as const;
const categoryFields = "id,name,slug,image,position,active,revision" as const;
type Db = SupabaseClient<Database>;

function publicClient(url: string, key: string): Db {
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}

async function loadGroups(db: Db, itemIds: string[]) {
  if (!itemIds.length) return new Map<string, ReturnType<typeof composeModifierGroups>>();
  const [groups, modifiers] = await Promise.all([
    db.from("matturo_modifier_groups").select(groupFields).in("item_id", itemIds),
    db.from("matturo_modifiers").select(modifierFields).in("item_id", itemIds),
  ]);
  if (groups.error || modifiers.error) throw new Error("Não foi possível carregar as opções do cardápio.");
  const result = new Map<string, ReturnType<typeof composeModifierGroups>>();
  for (const itemId of itemIds) {
    result.set(itemId, composeModifierGroups(
      (groups.data as ModifierGroupRecord[]).filter((group) => group.item_id === itemId),
      (modifiers.data as ModifierRecord[]).filter((modifier) => modifier.item_id === itemId),
    ));
  }
  return result;
}

async function withSignedImages(rows: MenuItemRecord[], db: Db): Promise<EditableDish[]> {
  const groups = await loadGroups(db, rows.map((row) => row.id));
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(rows.sort((a, b) => a.position - b.position).map(async (row) => {
    let image = row.image;
    if (image && !image.startsWith("/") && !image.startsWith("https://")) {
      const signed = await supabaseAdmin.storage.from("matturo-menu-images").createSignedUrl(image, 3600);
      if (signed.error) throw new Error("Não foi possível carregar uma fotografia do menu.");
      image = signed.data.signedUrl;
    }
    return { ...menuItemToDish(row, groups.get(row.id) ?? []), image, revision: row.revision, imagePath: row.image, position: row.position };
  }));
}

async function assertAdmin(supabase: { rpc: (name: "matturo_has_role", args: { wanted: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }) {
  const role = await supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
}

export const publicMenu = createServerFn({ method: "GET" }).handler(async (): Promise<Dish[]> => {
  setResponseHeader("Cache-Control", "no-store");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível consultar o cardápio.");
  const db = publicClient(url, key);
  const result = await db.from("matturo_menu_items").select(fields).eq("visible", true).order("position");
  if (result.error) throw new Error("Não foi possível carregar o cardápio.");
  return (await withSignedImages(result.data, db)).map(({ revision: _revision, imagePath: _imagePath, position: _position, ...dish }) => dish);
});

export const publicMenuCategories = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível consultar as categorias.");
  const result = await publicClient(url, key).from("matturo_menu_categories").select(categoryFields).eq("active", true).order("position");
  if (result.error) throw new Error("Não foi possível carregar as categorias.");
  return result.data;
});

export const adminMenu = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<EditableDish[]> => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_items").select(fields).order("position");
  if (result.error) throw new Error("Não foi possível carregar os produtos.");
  return withSignedImages(result.data, context.supabase);
});

export const adminCategories = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_categories").select(categoryFields).order("position");
  if (result.error) throw new Error("Não foi possível carregar as categorias.");
  return result.data;
});

const categoryEdit = z.object({
  id: z.string().uuid(), revision: z.number().int().positive(), name: z.string().trim().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80), position: z.number().int().min(0).max(10000), active: z.boolean(),
});

export const saveCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => categoryEdit.parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_categories").update({ name: data.name, slug: data.slug, position: data.position, active: data.active, revision: data.revision + 1 }).eq("id", data.id).eq("revision", data.revision).select(categoryFields).maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar a categoria. Verifique se o endereço já existe.");
  if (!result.data) throw new Error("Esta categoria foi alterada noutra janela. Atualize antes de editar.");
  return result.data;
});

export const createCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => categoryEdit.omit({ id: true, revision: true }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_categories").insert(data).select(categoryFields).single();
  if (result.error) throw new Error("Não foi possível criar a categoria. Verifique se o endereço já existe.");
  return result.data;
});

const menuBase = z.object({
  id: z.string().uuid(), revision: z.number().int().positive(), name: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  description: z.string().trim().max(2000), category: z.string().trim().min(1).max(80),
  position: z.number().int().min(0).max(10000), price_cents: z.number().int().min(0).max(100000), discount_percent: z.number().int().min(0).max(90).default(0),
  available: z.boolean(), visible: z.boolean(), imagePath: z.string().max(500).nullable(),
});
const menuEdit = menuBase.superRefine((value, context) => {
  if (value.imagePath && !value.imagePath.startsWith("/__l5e/") && !value.imagePath.startsWith(`${value.id}/`)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Fotografia inválida." });
});

export const saveMenuItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => menuEdit.parse(input)).handler(async ({ data, context }): Promise<EditableDish> => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const category = await context.supabase.from("matturo_menu_categories").select("slug").eq("slug", data.category).maybeSingle();
  if (category.error || !category.data) throw new Error("Escolha uma categoria existente.");
  const result = await context.supabase.from("matturo_menu_items").update({
    name: data.name, slug: data.slug, description: data.description, category: data.category, position: data.position,
    price_cents: data.price_cents, discount_percent: data.discount_percent, available: data.available, visible: data.visible, image: data.imagePath, revision: data.revision + 1,
  }).eq("id", data.id).eq("revision", data.revision).select(fields).maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar o produto. Tente novamente.");
  if (!result.data) throw new Error("Este produto foi alterado noutra janela. Atualize a página antes de editar.");
  return (await withSignedImages([result.data], context.supabase))[0]!;
});

const newMenuItem = menuBase.omit({ id: true, revision: true, available: true, visible: true, imagePath: true });
export const createMenuItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => newMenuItem.parse(input)).handler(async ({ data, context }): Promise<EditableDish> => {
  await assertAdmin(context.supabase);
  const category = await context.supabase.from("matturo_menu_categories").select("slug").eq("slug", data.category).maybeSingle();
  if (category.error || !category.data) throw new Error("Escolha uma categoria existente.");
  const id = crypto.randomUUID();
  const result = await context.supabase.from("matturo_menu_items").insert({ id, name: data.name, slug: data.slug, description: data.description, category: data.category, position: data.position, price_cents: data.price_cents, available: false, visible: false }).select(fields).single();
  if (result.error) throw new Error("Não foi possível criar o produto. Verifique se o endereço já existe.");
  return (await withSignedImages([result.data], context.supabase))[0]!;
});

export const deleteMenuItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_items").delete().eq("id", data.id);
  if (result.error) throw new Error("Não foi possível eliminar o produto.");
  return { ok: true };
});

export const deleteCategory = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const category = await context.supabase.from("matturo_menu_categories").select("slug").eq("id", data.id).single();
  if (category.error) throw new Error("Categoria não encontrada.");
  const items = await context.supabase.from("matturo_menu_items").select("id").eq("category", category.data.slug).limit(1);
  if (items.error) throw new Error("Não foi possível validar a categoria.");
  if (items.data.length) throw new Error("Mova os produtos desta categoria antes de a eliminar.");
  const result = await context.supabase.from("matturo_menu_categories").delete().eq("id", data.id);
  if (result.error) throw new Error("Não foi possível eliminar a categoria.");
  return { ok: true };
});

const groupBase = z.object({ itemId: z.string().uuid(), id: z.string().uuid(), revision: z.number().int().positive(), name: z.string().trim().min(1).max(160), required: z.boolean(), min: z.number().int().min(0).max(100), max: z.number().int().min(1).max(100), position: z.number().int().min(0).max(10000) });
const minMax = (value: { min: number; max: number }) => value.min <= value.max;
const groupEdit = groupBase.refine(minMax, { message: "O mínimo não pode ser superior ao máximo." });
export const saveModifierGroup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => groupEdit.parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_modifier_groups").update({ name: data.name, required: data.required, min: data.min, max: data.max, position: data.position, revision: data.revision + 1 }).eq("item_id", data.itemId).eq("id", data.id).eq("revision", data.revision).select("revision").maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar o grupo.");
  if (!result.data) throw new Error("Este grupo foi alterado noutra janela. Atualize antes de editar.");
  return result.data;
});

export const addModifierGroup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => groupBase.omit({ id: true, revision: true }).refine(minMax, { message: "O mínimo não pode ser superior ao máximo." }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const id = crypto.randomUUID();
  const result = await context.supabase.from("matturo_modifier_groups").insert({ item_id: data.itemId, id, name: data.name, required: data.required, min: data.min, max: data.max, position: data.position });
  if (result.error) throw new Error("Não foi possível criar o grupo.");
  return { id };
});

export const deleteModifierGroup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ itemId: z.string().uuid(), id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_modifier_groups").delete().eq("item_id", data.itemId).eq("id", data.id);
  if (result.error) throw new Error("Não foi possível eliminar o grupo.");
  return { ok: true };
});

const modifierEdit = z.object({ itemId: z.string().uuid(), groupId: z.string().uuid(), id: z.string().uuid(), revision: z.number().int().positive(), name: z.string().trim().min(1).max(160), price_cents: z.number().int().min(0).max(100000), max: z.number().int().min(1).max(100), position: z.number().int().min(0).max(10000) });
export const saveModifier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => modifierEdit.parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_modifiers").update({ name: data.name, price_cents: data.price_cents, max: data.max, position: data.position, revision: data.revision + 1 }).eq("item_id", data.itemId).eq("group_id", data.groupId).eq("id", data.id).eq("revision", data.revision).select("revision").maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar a opção.");
  if (!result.data) throw new Error("Esta opção foi alterada noutra janela. Atualize antes de editar.");
  return result.data;
});

export const addModifier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => modifierEdit.omit({ id: true, revision: true }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const id = crypto.randomUUID();
  const result = await context.supabase.from("matturo_modifiers").insert({ item_id: data.itemId, group_id: data.groupId, id, name: data.name, price_cents: data.price_cents, max: data.max, position: data.position });
  if (result.error) throw new Error("Não foi possível criar a opção.");
  return { id };
});

export const deleteModifier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ itemId: z.string().uuid(), groupId: z.string().uuid(), id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_modifiers").delete().eq("item_id", data.itemId).eq("group_id", data.groupId).eq("id", data.id);
  if (result.error) throw new Error("Não foi possível eliminar a opção.");
  return { ok: true };
});

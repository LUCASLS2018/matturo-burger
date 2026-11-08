import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { menuItemOrder, menuItemToDish, type Dish, type EditableDish, type MenuItemRecord } from "./menu";

const fields = "id,name,slug,description,category,price_cents,image,available,visible,revision" as const;

async function withSignedImages(rows: MenuItemRecord[]): Promise<EditableDish[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return Promise.all(rows.sort((a, b) => menuItemOrder(a) - menuItemOrder(b)).map(async (row) => {
    let image = row.image;
    if (image && !image.startsWith("/") && !image.startsWith("https://")) {
      const signed = await supabaseAdmin.storage.from("matturo-menu-images").createSignedUrl(image, 3600);
      if (signed.error) throw new Error("Não foi possível carregar uma fotografia do menu.");
      image = signed.data.signedUrl;
    }
    return { ...menuItemToDish(row), image, revision: row.revision, imagePath: row.image };
  }));
}

export const publicMenu = createServerFn({ method: "GET" }).handler(async (): Promise<Dish[]> => {
  setResponseHeader("Cache-Control", "no-store");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível consultar o cardápio.");
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const result = await db.from("matturo_menu_items").select(fields).eq("visible", true);
  if (result.error) throw new Error("Não foi possível carregar o cardápio.");
  return (await withSignedImages(result.data)).map(({ revision: _revision, imagePath: _imagePath, ...dish }) => dish);
});

async function assertAdmin(supabase: { rpc: (name: "matturo_has_role", args: { wanted: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }) {
  const role = await supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
}

export const adminMenu = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<EditableDish[]> => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_items").select(fields);
  if (result.error) throw new Error("Não foi possível carregar os produtos.");
  return withSignedImages(result.data);
});

const menuEdit = z.object({
  id: z.string().uuid(),
  revision: z.number().int().positive(),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  price_cents: z.number().int().min(0).max(100000),
  available: z.boolean(),
  visible: z.boolean(),
  imagePath: z.string().max(500).nullable(),
}).superRefine((value, context) => {
  if (value.imagePath && !value.imagePath.startsWith("/__l5e/") && !value.imagePath.startsWith(`${value.id}/`)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Fotografia inválida." });
  }
});

export const saveMenuItem = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => menuEdit.parse(input)).handler(async ({ data, context }): Promise<EditableDish> => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_menu_items").update({
    name: data.name,
    description: data.description,
    price_cents: data.price_cents,
    available: data.available,
    visible: data.visible,
    image: data.imagePath,
    revision: data.revision + 1,
  }).eq("id", data.id).eq("revision", data.revision).select(fields).maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar o produto. Tente novamente.");
  if (!result.data) throw new Error("Este produto foi alterado noutra janela. Atualize a página antes de editar.");
  return (await withSignedImages([result.data]))[0]!;
});

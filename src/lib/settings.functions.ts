import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { radiusZoneSchema, zoneSchema } from "./restaurant-settings";
import { isRestaurantOpen } from "./opening-hours";
import { distanceKm, findRadiusZone } from "./delivery-radius";

function publicDb(url: string, key: string) {
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

function publicEnvironment() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Não foi possível consultar o atendimento.");
  return { url, key };
}

export const publicSettings = createServerFn({ method: "GET" }).handler(async () => {
  setResponseHeader("Cache-Control", "no-store");
  const { url, key } = publicEnvironment();
  const db = publicDb(url, key);
  const [settings, zones] = await Promise.all([
    db.from("matturo_restaurant_settings").select("orders_paused,delivery_mode,store_latitude,store_longitude").eq("id", true).single(),
    db.from("matturo_delivery_zones").select("id,name,postal_prefixes,fee_cents,max_distance_km").eq("active", true).order("name"),
  ]);
  if (settings.error || zones.error) throw new Error("Não foi possível consultar o atendimento.");
  return {
    paused: settings.data.orders_paused,
    isOpen: isRestaurantOpen(new Date()),
    deliveryMode: settings.data.delivery_mode === "radius" ? "radius" as const : "postal" as const,
    storeReady: settings.data.store_latitude !== null && settings.data.store_longitude !== null,
    zones: zones.data,
  };
});

export const quoteRadiusDelivery = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    address: z.string().trim().min(3).max(250),
    postal: z.string().trim().regex(/^\d{4}-?\d{3}$/, "Indique o código postal completo."),
  }).parse(input))
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "no-store");
    const { url, key } = publicEnvironment();
    const db = publicDb(url, key);
    const [settings, zones] = await Promise.all([
      db.from("matturo_restaurant_settings").select("delivery_mode,store_latitude,store_longitude").eq("id", true).single(),
      db.from("matturo_delivery_zones").select("name,fee_cents,max_distance_km").eq("active", true).not("max_distance_km", "is", null),
    ]);
    if (settings.error || zones.error) throw new Error("Não foi possível calcular a entrega.");
    if (settings.data.delivery_mode !== "radius" || settings.data.store_latitude === null || settings.data.store_longitude === null) throw new Error("A entrega por raio ainda não está configurada.");
    const { geocodePt } = await import("./geocode.server");
    const point = await geocodePt(data.address, data.postal);
    if (!point) throw new Error("Não foi possível localizar esta morada. Confirme a rua, o número e o código postal.");
    const distance = distanceKm(
      { lat: settings.data.store_latitude, lng: settings.data.store_longitude },
      { lat: point.lat, lng: point.lng },
    );
    const zone = findRadiusZone(distance, zones.data);
    return { zone, distanceKm: Math.round(distance * 10) / 10 };
  });

export const adminSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
  const [settings, zones] = await Promise.all([
    context.supabase.from("matturo_restaurant_settings").select("*").eq("id", true).single(),
    context.supabase.from("matturo_delivery_zones").select("*").order("name"),
  ]);
  if (settings.error || zones.error) throw new Error("Não foi possível carregar as configurações.");
  return { settings: settings.data, zones: zones.data };
});

export const setOrderPause = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paused: z.boolean(), revision: z.number().int().positive() }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
    if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
    const result = await context.supabase.from("matturo_restaurant_settings").update({ orders_paused: data.paused, revision: data.revision + 1 }).eq("id", true).eq("revision", data.revision).select().maybeSingle();
    if (result.error) throw new Error("Não foi possível guardar. Tente novamente.");
    if (!result.data) throw new Error("As configurações foram alteradas noutra janela. Atualize antes de tentar novamente.");
    return result.data;
  });

export const saveStoreDelivery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    storeAddress: z.string().trim().min(5).max(250),
    deliveryMode: z.enum(["postal", "radius"]),
    revision: z.number().int().positive(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
    if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
    const current = await context.supabase.from("matturo_restaurant_settings").select("store_address,store_latitude,store_longitude").eq("id", true).single();
    if (current.error) throw new Error("Não foi possível ler a morada da loja.");
    let latitude = current.data.store_latitude;
    let longitude = current.data.store_longitude;
    if (data.storeAddress !== current.data.store_address || latitude === null || longitude === null) {
      const { geocodeAddressPt } = await import("./geocode.server");
      const point = await geocodeAddressPt(data.storeAddress);
      if (!point) throw new Error("Não foi possível localizar a morada da loja. Escreva a rua, o número e a localidade.");
      latitude = point.lat;
      longitude = point.lng;
    }
    const result = await context.supabase.from("matturo_restaurant_settings").update({
      store_address: data.storeAddress,
      delivery_mode: data.deliveryMode,
      store_latitude: latitude,
      store_longitude: longitude,
      revision: data.revision + 1,
    }).eq("id", true).eq("revision", data.revision).select().maybeSingle();
    if (result.error) throw new Error("Não foi possível guardar a entrega por raio.");
    if (!result.data) throw new Error("As configurações foram alteradas noutra janela. Atualize antes de tentar novamente.");
    return result.data;
  });

const deliveryZoneInput = z.union([
  zoneSchema.extend({ id: z.string().uuid().optional(), revision: z.number().int().positive().optional() }),
  radiusZoneSchema.extend({ id: z.string().uuid().optional(), revision: z.number().int().positive().optional() }),
]);

export const saveDeliveryZone = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => deliveryZoneInput.parse(input))
  .handler(async ({ data, context }) => {
    const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
    if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
    const { id, revision, ...values } = data;
    if (id && !revision) throw new Error("Atualize a zona antes de editar.");
    const result = id && revision
      ? await context.supabase.from("matturo_delivery_zones").update({ ...values, revision: revision + 1 }).eq("id", id).eq("revision", revision).select().maybeSingle()
      : await context.supabase.from("matturo_delivery_zones").insert(values).select().single();
    if (result.error) throw new Error("Não foi possível guardar a zona. Tente novamente.");
    if (!result.data) throw new Error("Esta zona foi alterada noutra janela. Atualize antes de editar.");
    return result.data;
  });

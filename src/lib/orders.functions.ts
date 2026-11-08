import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderServices, needsDeliveryAddress } from "./order-service";
import { findZone } from "./restaurant-settings";
import { priceLine, canMoveOrder, orderStatuses, orderAccessValid } from "./order-pricing";
import { tokenHash } from "./delivery";
import { composeModifierGroups, menuItemToDish, type ModifierGroupRecord, type ModifierRecord } from "./menu";

const menuFields = "id,name,slug,description,category,price_cents,image,available,visible,revision,position" as const;
const orderInput = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^\+?[\d\s]{9,16}$/),
  service: z.enum(orderServices),
  address: z.string().trim().max(250).optional(),
  postal: z.string().trim().max(8).optional(),
  notes: z.string().trim().max(500).optional(),
  expectedTotalCents: z.number().int().min(0).max(1000000),
  acceptRepriced: z.boolean().default(false),
  submissionId: z.string().uuid(),
  accessToken: z.string().regex(/^[a-f0-9]{64}$/),
  items: z.array(z.object({
    productId: z.string().uuid(), qty: z.number().int(),
    options: z.record(z.string().max(100), z.string().max(600)).default({}),
    selected: z.record(z.string().uuid(), z.number().int().min(0).max(100)).optional(),
  })).min(1).max(60),
});

export const placeOrder = createServerFn({ method: "POST" }).inputValidator((input) => orderInput.parse(input)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [settings, zones, menu] = await Promise.all([
    db.from("matturo_restaurant_settings").select("orders_paused").eq("id", true).single(),
    db.from("matturo_delivery_zones").select("name,postal_prefixes,fee_cents").eq("active", true),
    db.from("matturo_menu_items").select(menuFields).eq("visible", true),
  ]);
  if (settings.error || zones.error || menu.error) throw new Error("Não foi possível registar o pedido. Tente novamente.");
  if (settings.data.orders_paused) throw new Error("O Matturo está temporariamente sem aceitar pedidos.");
  const itemIds = menu.data.map((item) => item.id);
  const [groups, modifiers] = await Promise.all([
    db.from("matturo_modifier_groups").select("item_id,id,name,required,min,max,position,revision").in("item_id", itemIds),
    db.from("matturo_modifiers").select("item_id,group_id,id,name,price_cents,max,position,revision").in("item_id", itemIds),
  ]);
  if (groups.error || modifiers.error) throw new Error("Não foi possível validar as opções. Tente novamente.");
  const currentMenu = menu.data.map((item) => menuItemToDish(item, composeModifierGroups(
    (groups.data as ModifierGroupRecord[]).filter((group) => group.item_id === item.id),
    (modifiers.data as ModifierRecord[]).filter((modifier) => modifier.item_id === item.id),
  )));
  const lines = data.items.map((line) => priceLine(line, currentMenu));
  const delivery = needsDeliveryAddress(data.service);
  const zone = delivery ? findZone(data.postal ?? "", zones.data) : null;
  if (delivery && (!data.address || !zone)) throw new Error("Indique a morada e um código postal de uma zona de entrega.");
  const subtotal = lines.reduce((sum, line) => sum + line.line_total_cents, 0);
  const fee = zone?.fee_cents ?? 0;
  const total = subtotal + fee;
  if (total !== data.expectedTotalCents && !data.acceptRepriced) return { kind: "price_changed" as const, totalCents: total };
  const reference = "M" + Date.now().toString(36).toUpperCase().slice(-6) + crypto.randomUUID().slice(0, 2).toUpperCase();
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const result = await db.rpc("matturo_place_order", {
    p_order: {
      reference, customer_name: data.name, customer_phone: data.phone, service: data.service,
      address: delivery ? data.address ?? "" : "", postal_code: delivery ? data.postal ?? "" : "", zone_name: zone?.name ?? "",
      delivery_fee_cents: fee, subtotal_cents: subtotal, total_cents: total, notes: data.notes || "",
      access_token_hash: await tokenHash(data.accessToken), idempotency_key: data.submissionId,
      request_fingerprint: await tokenHash(ip), access_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    p_items: lines,
  });
  if (result.error || !result.data?.[0]) {
    console.error(result.error);
    throw new Error(result.error?.message.includes("Demasiados") ? "Demasiados pedidos seguidos. Aguarde alguns minutos." : "Não foi possível registar o pedido. Tente novamente.");
  }
  return { kind: "created" as const, reference: result.data[0].reference, token: data.accessToken };
});

export const orderByToken = createServerFn({ method: "GET" }).inputValidator((input) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const result = await db.from("matturo_orders").select("id,reference,service,zone_name,delivery_fee_cents,subtotal_cents,total_cents,status,created_at,access_expires_at,access_revoked_at").eq("access_token_hash", await tokenHash(data.token)).maybeSingle();
  if (result.error || !result.data || !orderAccessValid(result.data.access_expires_at, result.data.access_revoked_at)) return null;
  const items = await db.from("matturo_order_items").select("name,options,qty,line_total_cents").eq("order_id", result.data.id);
  const { id, access_expires_at: _expires, access_revoked_at: _revoked, ...order } = result.data;
  const delivery = await db.from("matturo_deliveries").select("id,status,courier_id,destination_lat,destination_lng").eq("order_id", id).maybeSingle();
  let tracking = null as null | { status: string; courier: string; lat: number; lng: number; position: { latitude: number; longitude: number; recorded_at: string } | null };
  if (delivery.data && delivery.data.status !== "cancelled") {
    const courier = delivery.data.courier_id ? await db.from("matturo_profiles").select("name").eq("id", delivery.data.courier_id).maybeSingle() : null;
    const position = delivery.data.status === "active" ? await db.from("matturo_delivery_positions").select("latitude,longitude,recorded_at").eq("delivery_id", delivery.data.id).maybeSingle() : null;
    tracking = { status: delivery.data.status, courier: (courier?.data?.name || "O estafeta").split(" ")[0] ?? "O estafeta", lat: delivery.data.destination_lat, lng: delivery.data.destination_lng, position: position?.data ?? null };
  }
  return { ...order, items: items.data ?? [], tracking };
});

async function assertAdmin(supabase: { rpc: (name: "matturo_has_role", args: { wanted: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }) {
  const role = await supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (role.error || !role.data) throw new Error("Acesso reservado ao administrador.");
}

export const claimOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input)).handler(async ({ data, context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const hash = await tokenHash(data.token);
  const current = await db.from("matturo_orders").select("id,customer_id,access_expires_at,access_revoked_at").eq("access_token_hash", hash).maybeSingle();
  if (current.error || !current.data || !orderAccessValid(current.data.access_expires_at, current.data.access_revoked_at)) throw new Error("Pedido não encontrado.");
  if (current.data.customer_id && current.data.customer_id !== context.userId) throw new Error("Este pedido já pertence a outra conta.");
  if (!current.data.customer_id) {
    const updated = await db.from("matturo_orders").update({ customer_id: context.userId }).eq("id", current.data.id).is("customer_id", null);
    if (updated.error) throw new Error("Não foi possível associar o pedido à sua conta.");
  }
  return { ok: true };
});

export const myOrders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const result = await context.supabase.from("matturo_orders").select("id,reference,service,zone_name,delivery_fee_cents,subtotal_cents,total_cents,status,created_at,matturo_order_items(name,options,qty,line_total_cents),matturo_order_events(status,created_at)").order("created_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("Não foi possível carregar os seus pedidos.");
  return result.data;
});

export const adminOrders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_orders").select("id,reference,customer_name,customer_phone,service,address,postal_code,zone_name,delivery_fee_cents,subtotal_cents,total_cents,notes,status,created_at,matturo_order_items(name,options,qty,line_total_cents),matturo_order_events(status,actor_id,created_at)").order("created_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("Não foi possível carregar os pedidos.");
  return result.data;
});

export const setOrderStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid(), from: z.enum(orderStatuses), to: z.enum(orderStatuses) }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  if (!canMoveOrder(data.from, data.to)) throw new Error("Mudança de estado inválida.");
  const result = await context.supabase.from("matturo_orders").update({ status: data.to }).eq("id", data.id).eq("status", data.from).select("id").maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar. Tente novamente.");
  if (!result.data) throw new Error("Este pedido foi alterado noutra janela. Atualize a lista.");
  return { ok: true };
});

export const orderCourierBoard = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  await assertAdmin(db);
  const roles = await db.from("matturo_user_roles").select("user_id").eq("role", "courier");
  if (roles.error) throw roles.error;
  const ids = roles.data.map((role) => role.user_id);
  const [profiles, deliveries, availability] = await Promise.all([
    ids.length ? db.from("matturo_profiles").select("id,name,photo_path").in("id", ids) : Promise.resolve({ data: [] as { id: string; name: string; photo_path: string | null }[], error: null }),
    db.from("matturo_deliveries").select("order_id,courier_id,status").not("order_id", "is", null),
    ids.length ? db.from("matturo_courier_availability").select("user_id,state").in("user_id", ids) : Promise.resolve({ data: [] as { user_id: string; state: string }[], error: null }),
  ]);
  if (deliveries.error || availability.error || profiles.error) throw new Error("Não foi possível carregar os estafetas.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const couriers = await Promise.all((profiles.data ?? []).map(async (profile) => {
    const signed = profile.photo_path ? await supabaseAdmin.storage.from("matturo-courier-photos").createSignedUrl(profile.photo_path, 300) : null;
    const activeCount = deliveries.data.filter((delivery) => delivery.courier_id === profile.id && ["confirmed", "to_restaurant", "collected", "active"].includes(delivery.status)).length;
    return { id: profile.id, name: profile.name || "Entregador", photo: signed?.data?.signedUrl ?? null, state: availability.data.find((row) => row.user_id === profile.id)?.state ?? "available", activeCount };
  }));
  return { couriers, deliveries: deliveries.data };
});

export const assignOrderCourier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ orderId: z.string().uuid(), courierId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    await assertAdmin(db);
    const order = await db.from("matturo_orders").select("reference,service,address,postal_code,customer_name,customer_phone,status").eq("id", data.orderId).single();
    if (order.error) throw new Error("Pedido não encontrado.");
    if (order.data.service !== "Delivery" || !order.data.address) throw new Error("Só pedidos de delivery têm estafeta.");
    if (["concluido", "cancelado"].includes(order.data.status)) throw new Error("Pedido já fechado.");
    const { geocodePt } = await import("./geocode.server");
    const point = await geocodePt(order.data.address, order.data.postal_code ?? "");
    if (!point) throw new Error("Não consegui localizar este código postal. Confirme o código postal do cliente.");
    const destination = `${order.data.address} · ${order.data.postal_code ?? ""} — ${order.data.customer_name} (${order.data.customer_phone})`.slice(0, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.rpc("matturo_assign_order_courier", { p_admin_id: context.userId, p_order_id: data.orderId, p_courier_id: data.courierId, p_destination: destination, p_lat: point.lat, p_lng: point.lng });
    if (result.error) throw new Error(result.error.message.includes("inativo") ? "Este estafeta está inativo." : result.error.message.includes("duplicate") ? "Este pedido já tem estafeta." : "Não foi possível atribuir o estafeta.");
    return { id: result.data };
  });

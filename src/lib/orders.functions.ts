import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderServices, needsDeliveryAddress } from "./order-service";
import { findZone } from "./restaurant-settings";
import { priceLine, canMoveOrder, orderStatuses } from "./order-pricing";
import { tokenHash } from "./delivery";

const orderInput = z.object({
  name: z.string().trim().min(1).max(100),
  phone: z.string().trim().regex(/^\+?[\d\s]{9,16}$/),
  service: z.enum(orderServices),
  address: z.string().trim().max(250).optional(),
  postal: z.string().trim().max(8).optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(z.object({ productId: z.string().max(100), qty: z.number().int(), options: z.record(z.string().max(100), z.string().max(600)) })).min(1).max(60),
});

export const placeOrder = createServerFn({ method: "POST" }).inputValidator((i) => orderInput.parse(i)).handler(async ({ data }) => {
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [settings, zones] = await Promise.all([
    db.from("matturo_restaurant_settings").select("orders_paused").eq("id", true).single(),
    db.from("matturo_delivery_zones").select("name,postal_prefixes,fee_cents").eq("active", true),
  ]);
  if (settings.error || zones.error) throw new Error("Não foi possível registar o pedido. Tente novamente.");
  if (settings.data.orders_paused) throw new Error("O Matturo está temporariamente sem aceitar pedidos.");
  const lines = data.items.map((l) => priceLine(l));
  const delivery = needsDeliveryAddress(data.service);
  const zone = delivery ? findZone(data.postal ?? "", zones.data) : null;
  if (delivery && (!data.address || !zone)) throw new Error("Indique a morada e um código postal de uma zona de entrega.");
  const subtotal = lines.reduce((s, l) => s + l.line_total_cents, 0);
  const fee = zone?.fee_cents ?? 0;
  const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const reference = "M" + Date.now().toString(36).toUpperCase().slice(-6);
  const order = await db.from("matturo_orders").insert({
    reference, customer_name: data.name, customer_phone: data.phone, service: data.service,
    address: delivery ? data.address ?? null : null, postal_code: delivery ? data.postal ?? null : null, zone_name: zone?.name ?? null,
    delivery_fee_cents: fee, subtotal_cents: subtotal, total_cents: subtotal + fee, notes: data.notes || null,
    access_token_hash: await tokenHash(token),
  }).select("id").single();
  if (order.error) { console.error(order.error); throw new Error("Não foi possível registar o pedido. Tente novamente."); }
  const items = await db.from("matturo_order_items").insert(lines.map((l) => ({ ...l, order_id: order.data.id })));
  if (items.error) { await db.from("matturo_orders").delete().eq("id", order.data.id); throw new Error("Não foi possível registar o pedido. Tente novamente."); }
  return { reference, token };
});

export const orderByToken = createServerFn({ method: "GET" }).inputValidator((i) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(i)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const o = await db.from("matturo_orders").select("id,reference,service,zone_name,delivery_fee_cents,subtotal_cents,total_cents,status,created_at").eq("access_token_hash", await tokenHash(data.token)).maybeSingle();
  if (o.error || !o.data) return null;
  const items = await db.from("matturo_order_items").select("name,options,qty,line_total_cents").eq("order_id", o.data.id);
  const { id: _id, ...order } = o.data;
  const d = await db.from("matturo_deliveries").select("id,status,courier_id,destination_lat,destination_lng").eq("order_id", o.data.id).maybeSingle();
  let tracking = null as null | { status: string; courier: string; lat: number; lng: number; position: { latitude: number; longitude: number; recorded_at: string } | null };
  if (d.data && d.data.status !== "cancelled") {
    const c = d.data.courier_id ? await db.from("matturo_profiles").select("name").eq("id", d.data.courier_id).maybeSingle() : null;
    const pos = d.data.status === "active" ? await db.from("matturo_delivery_positions").select("latitude,longitude,recorded_at").eq("delivery_id", d.data.id).maybeSingle() : null;
    tracking = { status: d.data.status, courier: (c?.data?.name || "O estafeta").split(" ")[0], lat: d.data.destination_lat, lng: d.data.destination_lng, position: pos?.data ?? null };
  }
  return { ...order, items: items.data ?? [], tracking };
});

async function assertAdmin(supabase: { rpc: (n: "matturo_has_role", a: { wanted: string }) => PromiseLike<{ data: boolean | null; error: unknown }> }) {
  const r = await supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (r.error || !r.data) throw new Error("Acesso reservado ao administrador.");
}

export const adminOrders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const r = await context.supabase.from("matturo_orders").select("id,reference,customer_name,customer_phone,service,address,postal_code,zone_name,delivery_fee_cents,subtotal_cents,total_cents,notes,status,created_at,matturo_order_items(name,options,qty,line_total_cents)").order("created_at", { ascending: false }).limit(100);
  if (r.error) throw new Error("Não foi possível carregar os pedidos.");
  return r.data;
});

export const setOrderStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i) => z.object({ id: z.string().uuid(), from: z.enum(orderStatuses), to: z.enum(orderStatuses) }).parse(i)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  if (!canMoveOrder(data.from, data.to)) throw new Error("Mudança de estado inválida.");
  const r = await context.supabase.from("matturo_orders").update({ status: data.to }).eq("id", data.id).eq("status", data.from).select("id").maybeSingle();
  if (r.error) throw new Error("Não foi possível guardar. Tente novamente.");
  if (!r.data) throw new Error("Este pedido foi alterado noutra janela. Atualize a lista.");
  return { ok: true };
});

export const orderCourierBoard = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const db = context.supabase;
  const ok = await db.rpc("matturo_has_role", { wanted: "admin" }); if (!ok.data) throw new Error("Sem acesso administrativo.");
  const roles = await db.from("matturo_user_roles").select("user_id").eq("role", "courier"); if (roles.error) throw roles.error;
  const ids = roles.data.map((r) => r.user_id);
  const profiles = ids.length ? await db.from("matturo_profiles").select("id,name").in("id", ids) : { data: [] as { id: string; name: string }[] };
  const deliveries = await db.from("matturo_deliveries").select("order_id,courier_id,status").not("order_id", "is", null); if (deliveries.error) throw deliveries.error;
  return { couriers: (profiles.data ?? []).map((p) => ({ id: p.id, name: p.name || "Entregador" })), deliveries: deliveries.data };
});

export const assignOrderCourier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ orderId: z.string().uuid(), courierId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const db = context.supabase;
    const ok = await db.rpc("matturo_has_role", { wanted: "admin" }); if (!ok.data) throw new Error("Sem acesso administrativo.");
    const o = await db.from("matturo_orders").select("reference,service,address,postal_code,customer_name,customer_phone,status").eq("id", data.orderId).single();
    if (o.error) throw o.error;
    if (o.data.service !== "Delivery" || !o.data.address) throw new Error("Só pedidos de delivery têm estafeta.");
    if (["concluido", "cancelado"].includes(o.data.status)) throw new Error("Pedido já fechado.");
    const query = `${o.data.address}, ${o.data.postal_code ?? ""}, Portugal`;
    let lat = 38.9553, lng = -8.9897; // centro de Vila Franca de Xira se a morada não for encontrada
    try {
      const g = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pt&q=${encodeURIComponent(query)}`, { headers: { "User-Agent": "MatturoBurger/1.0" } });
      const j = (await g.json()) as { lat: string; lon: string }[];
      if (j[0]) { lat = Number(j[0].lat); lng = Number(j[0].lon); }
    } catch { /* mantém aproximação */ }
    const destination = `${o.data.address} · ${o.data.postal_code ?? ""} — ${o.data.customer_name} (${o.data.customer_phone})`.slice(0, 300);
    const r = await db.from("matturo_deliveries").insert({ order_id: data.orderId, reference: o.data.reference, destination, destination_lat: lat, destination_lng: lng, courier_id: data.courierId }).select("id").single();
    if (r.error) throw new Error(r.error.code === "23505" ? "Este pedido já tem estafeta." : r.error.message);
    return { id: r.data.id };
  });

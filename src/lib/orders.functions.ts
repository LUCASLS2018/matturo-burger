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
    address: delivery ? data.address : null, postal_code: delivery ? data.postal : null, zone_name: zone?.name ?? null,
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
  return { ...order, items: items.data ?? [] };
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

import { orderNumber } from "./order-number";
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { orderServices, needsDeliveryAddress } from "./order-service";
import { findZone } from "./restaurant-settings";
import { priceLine, canMoveOrder, orderStatuses, orderAccessValid } from "./order-pricing";
import { tokenHash } from "./delivery";
import { REWARD_SLUG } from "./loyalty";
import { canonicalPhone, loyaltyPhoneSchema, rewardUnitPrice, meetsRewardMinimum, REWARD_MINIMUM_MESSAGE } from "./loyalty-phone";
import { orderSources, type OrderSource } from "./order-source";
import { composeModifierGroups, menuItemToDish, type ModifierGroupRecord, type ModifierRecord } from "./menu";
import { CLOSED_ORDER_MESSAGE, isRestaurantOpen } from "./opening-hours";

const menuFields = "id,name,slug,description,category,price_cents,image,available,visible,revision,position" as const;
const orderInput = z.object({
  name: z.string().trim().min(1).max(100),
  phone: loyaltyPhoneSchema,
  service: z.enum(orderServices),
  source: z.enum(orderSources).default("web"),
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
    reward: z.boolean().optional(),
  })).min(1).max(60),
});

async function createOrder(data: z.infer<typeof orderInput>) {
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
  const rewardIndex = data.items.findIndex((line) => line.reward);
  let rewardSessionHash: string | null = null;
  if (rewardIndex >= 0) {
    if (data.items.filter((line) => line.reward).length > 1) throw new Error("Só pode resgatar um Hamburguinho por pedido.");
    const inputLine = data.items[rewardIndex];
    const line = lines[rewardIndex];
    const dish = currentMenu.find((item) => item.id === inputLine?.productId);
    if (!line || !dish || dish.slug !== REWARD_SLUG || inputLine?.qty !== 1) throw new Error("Recompensa inválida.");
    const { verifiedLoyalty } = await import("./loyalty-session.server");
    const session = await verifiedLoyalty();
    if (!session || session.phone !== data.phone) throw new Error("Confirme o telemóvel deste pedido em Os meus pontos para resgatar.");
    rewardSessionHash = session.hash;
    // The transaction below checks balance under a lock, including idempotent retries.
    const unit = rewardUnitPrice(line.unit_price_cents, Math.round(dish.price * 100));
    lines[rewardIndex] = { ...line, name: `${line.name} (GRÁTIS · fidelização)`, unit_price_cents: unit, line_total_cents: unit };
  }
  const delivery = needsDeliveryAddress(data.service);
  const zone = delivery ? findZone(data.postal ?? "", zones.data) : null;
  if (delivery && (!data.address || !zone)) throw new Error("Indique a morada e um código postal de uma zona de entrega.");
  const subtotal = lines.reduce((sum, line) => sum + line.line_total_cents, 0);
  if (!meetsRewardMinimum(rewardIndex >= 0, subtotal)) throw new Error(REWARD_MINIMUM_MESSAGE);
  const fee = zone?.fee_cents ?? 0;
  const total = subtotal + fee;
  if (total !== data.expectedTotalCents && !data.acceptRepriced) return { kind: "price_changed" as const, totalCents: total };
  const reference = "M" + Date.now().toString(36).toUpperCase().slice(-6) + crypto.randomUUID().slice(0, 2).toUpperCase();
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const result = await db.rpc("matturo_place_loyalty_order", {
    p_order: {
      reference, customer_name: data.name, customer_phone: data.phone, service: data.service, source: data.source,
      address: delivery ? data.address ?? "" : "", postal_code: delivery ? data.postal ?? "" : "", zone_name: zone?.name ?? "",
      delivery_fee_cents: fee, subtotal_cents: subtotal, total_cents: total, notes: data.notes || "",
      access_token_hash: await tokenHash(data.accessToken), idempotency_key: data.submissionId,
      request_fingerprint: await tokenHash(ip), access_expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    },
    p_items: lines,
    ...(rewardSessionHash ? { p_session_hash: rewardSessionHash } : {}),
    p_reward: rewardIndex >= 0,
  });
  if (result.error || !result.data?.[0]) {
    const message = result.error?.message ?? "";
    throw new Error(message.includes("Demasiados") ? "Demasiados pedidos seguidos. Aguarde alguns minutos." : message.includes("100 pontos") ? "Ainda não tem 100 pontos disponíveis para resgatar." : message.includes("Confirme") ? "A confirmação do telemóvel expirou. Confirme novamente em Os meus pontos." : "Não foi possível registar o pedido. Tente novamente.");
  }
  const numbered = await db.from("matturo_orders").select("daily_number,order_day").eq("id", result.data[0].id).single();
  if (numbered.error) throw new Error("Pedido guardado. Tente novamente para obter a confirmação.");
  return { kind: "created" as const, reference: result.data[0].reference, daily_number: numbered.data.daily_number, order_day: numbered.data.order_day, token: data.accessToken };
}

export const placeOrder = createServerFn({ method: "POST" }).inputValidator((input) => orderInput.parse(input)).handler(({ data }) => createOrder(data));

export const createManualOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => orderInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase);
    if (data.items.some((item) => item.reward)) throw new Error("As ofertas devem ser resgatadas pela conta do cliente.");
    return createOrder({ ...data, source: "telefone" satisfies OrderSource });
  });

export const orderByToken = createServerFn({ method: "GET" }).inputValidator((input) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const result = await db.from("matturo_orders").select("id,reference,order_day,daily_number,service,zone_name,delivery_fee_cents,subtotal_cents,total_cents,status,created_at,access_expires_at,access_revoked_at").eq("access_token_hash", await tokenHash(data.token)).maybeSingle();
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
  const result = await context.supabase.from("matturo_orders").select("id,reference,order_day,daily_number,service,zone_name,delivery_fee_cents,subtotal_cents,total_cents,status,created_at,matturo_order_items(name,options,qty,line_total_cents),matturo_order_events(status,created_at)").order("created_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("Não foi possível carregar os seus pedidos.");
  return result.data;
});

export const adminOrders = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_orders").select("id,reference,order_day,daily_number,customer_name,customer_phone,service,source,address,postal_code,zone_name,delivery_fee_cents,subtotal_cents,total_cents,notes,status,created_at,matturo_order_items(name,options,qty,line_total_cents),matturo_order_events(status,actor_id,created_at)").order("created_at", { ascending: false }).limit(100);
  if (result.error) throw new Error("Não foi possível carregar os pedidos.");
  return result.data;
});

export const setOrderStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ id: z.string().uuid(), from: z.enum(orderStatuses), to: z.enum(orderStatuses) }).parse(input)).handler(async ({ data, context }) => {
  await assertAdmin(context.supabase);
  if (!canMoveOrder(data.from, data.to)) throw new Error("Mudança de estado inválida.");
  const result = await context.supabase.from("matturo_orders").update({ status: data.to }).eq("id", data.id).eq("status", data.from).select("id").maybeSingle();
  if (result.error) throw new Error("Não foi possível guardar. Tente novamente.");
  if (!result.data) throw new Error("Este pedido foi alterado noutra janela. Atualize a lista.");
  const { notifyOrder } = await import("./push.server");
  await notifyOrder(data.id).catch(() => 0);
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
    const { notifyOrder } = await import("./push.server");
    await notifyOrder(data.orderId).catch(() => 0);
    const { notifyCourier } = await import("./push.server");
    await notifyCourier(data.orderId).catch(() => 0);
    return { id: result.data };
  });

export const adminCustomers = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const result = await context.supabase.from("matturo_orders").select("reference,order_day,daily_number,customer_name,customer_phone,address,postal_code,service,total_cents,status,created_at").order("created_at", { ascending: false }).limit(5000);
  if (result.error) throw new Error("Não foi possível carregar os clientes.");
  const { groupCustomers } = await import("./customers");
  return groupCustomers(result.data);
});

export const myLoyalty = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  // An optional customer account is not evidence of telephone ownership.
  const { verifiedLoyalty } = await import("./loyalty-session.server");
  const session = await verifiedLoyalty();
  return { available: session?.available ?? 0, verified: Boolean(session) };
});

export const adminLoyalty = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  await assertAdmin(context.supabase);
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  // Read every page: PostgREST caps each response even when a larger limit is requested.
  const orders: { customer_name: string; customer_phone: string }[] = [];
  const wallets: { id: string; phone: string; balance: number }[] = [];
  const movements: { wallet_id: string; points: number; kind: string; created_at: string; matturo_orders: { reference: string; status: string; daily_number: number; order_day: string } | null }[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await db.from("matturo_orders").select("customer_name,customer_phone").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (page.error) throw new Error("Não foi possível carregar a fidelização.");
    orders.push(...page.data);
    if (page.data.length < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const page = await db.from("matturo_loyalty_wallets").select("id,phone,balance").order("id").range(offset, offset + 499);
    if (page.error) throw new Error("Não foi possível carregar a fidelização.");
    wallets.push(...page.data);
    if (page.data.length < 500) break;
  }
  for (let offset = 0; ; offset += 500) {
    const page = await db.from("matturo_loyalty_movements").select("wallet_id,points,kind,created_at,matturo_orders(reference,status,daily_number,order_day)").order("created_at", { ascending: false }).order("id").range(offset, offset + 499);
    if (page.error) throw new Error("Não foi possível carregar a fidelização.");
    movements.push(...page.data);
    if (page.data.length < 500) break;
  }
  const names = new Map<string, string>();
  for (const order of orders) {
    try { const phone = canonicalPhone(order.customer_phone); if (!names.has(phone)) names.set(phone, order.customer_name); } catch { /* Invalid historical numbers remain isolated. */ }
  }
  return wallets.map((wallet) => {
    const own = movements.filter((movement) => movement.wallet_id === wallet.id);
    const earned = own.filter((movement) => movement.kind === "earn").reduce((sum, movement) => sum + movement.points, 0);
    const spent = -own.filter((movement) => movement.kind !== "earn").reduce((sum, movement) => sum + movement.points, 0);
    return { id: wallet.id, name: names.get(wallet.phone) ?? "Cliente", phone: wallet.phone, available: wallet.balance, earned, spent,
      redemptions: own.filter((movement) => movement.kind === "redeem").map((movement) => ({ at: movement.created_at, reference: movement.matturo_orders?.reference ?? "", number: movement.matturo_orders ? orderNumber(movement.matturo_orders) : "—", cancelled: movement.matturo_orders?.status === "cancelado" })) };
  }).sort((a, b) => b.available - a.available);
});

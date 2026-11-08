import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tokenHash, validTrackingLink } from "./delivery";

const idSchema = z.object({ id: z.string().uuid() });

export const deliveryDashboard = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  setResponseHeader("Cache-Control", "no-store");
  const db = context.supabase;
  const roles = await db.from("matturo_user_roles").select("role").eq("user_id", context.userId);
  if (roles.error) throw roles.error;
  const admin = roles.data.some((role) => role.role === "admin");
  const profile = await db.from("matturo_profiles").select("*").eq("id", context.userId).maybeSingle();
  if (!profile.data) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result = await supabaseAdmin.from("matturo_profiles").upsert({ id: context.userId, name: "" }, { onConflict: "id", ignoreDuplicates: true });
    if (result.error) throw result.error;
  }
  const deliveries = await db.from("matturo_deliveries").select("*").order("created_at", { ascending: false }).limit(100);
  if (deliveries.error) throw deliveries.error;
  const orderIds = deliveries.data.map((delivery) => delivery.order_id).filter((id): id is string => Boolean(id));
  const [positions, events, profiles, couriers, availability, orders] = await Promise.all([
    db.from("matturo_delivery_positions").select("*"),
    db.from("matturo_delivery_events").select("*").order("created_at", { ascending: false }).limit(200),
    admin ? db.from("matturo_profiles").select("*") : Promise.resolve(profile),
    admin ? db.from("matturo_user_roles").select("user_id").eq("role", "courier") : Promise.resolve(null),
    db.from("matturo_courier_availability").select("*"),
    orderIds.length ? db.from("matturo_orders").select("id,reference,customer_name,customer_phone,address,postal_code,notes,service,total_cents,matturo_order_items(name,options,qty,line_total_cents)").in("id", orderIds) : Promise.resolve({ data: [] as never[], error: null }),
  ]);
  if (positions.error || events.error || availability.error || orders.error) throw new Error("Não foi possível carregar as entregas.");
  return {
    admin, courier: roles.data.some((role) => role.role === "courier"), userId: context.userId,
    profile: profile.data, profiles: Array.isArray(profiles.data) ? profiles.data : [],
    courierIds: couriers?.data?.map((role) => role.user_id) ?? [], deliveries: deliveries.data,
    positions: positions.data, events: events.data ?? [], availability: availability.data, orders: orders.data,
  };
});

export const teamSummary = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const roles = await context.supabase.from("matturo_user_roles").select("role").eq("user_id", context.userId);
  if (roles.error) throw roles.error;
  const profile = await context.supabase.from("matturo_profiles").select("name").eq("id", context.userId).maybeSingle();
  return { admin: roles.data.some((role) => role.role === "admin"), courier: roles.data.some((role) => role.role === "courier"), name: profile.data?.name ?? "" };
});

export const setCourierAvailability = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ state: z.enum(["available", "inactive"]) }).parse(input)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("matturo_set_courier_availability", { p_courier_id: context.userId, next_state: data.state });
  if (result.error) throw new Error(result.error.message.includes("Conclua") ? "Conclua as entregas ativas antes de ficar disponível." : "Não foi possível alterar a disponibilidade.");
  return { state: result.data };
});

export const createDelivery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ reference: z.string().trim().min(1).max(100), destination: z.string().trim().min(5).max(300), courier_id: z.string().uuid(), destination_lat: z.number().min(-90).max(90), destination_lng: z.number().min(-180).max(180) }).parse(input)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (!role.data) throw new Error("Sem acesso administrativo.");
  const result = await context.supabase.from("matturo_deliveries").insert(data).select().single();
  if (result.error) throw result.error;
  return result.data;
});

export const changeDelivery = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idSchema.extend({ status: z.enum(["to_restaurant", "collected", "active", "delivered"]) }).parse(input)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("matturo_set_delivery_state", { actor: context.userId, delivery: data.id, next_state: data.status });
  if (result.error) throw new Error("Não foi possível mudar o estado da entrega. Atualize a página.");
  return true;
});

export const recordPosition = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idSchema.extend({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180), accuracy: z.number().nonnegative().finite() }).parse(input)).handler(async ({ data, context }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.rpc("matturo_record_position", { actor: context.userId, delivery: data.id, lat: data.lat, lng: data.lng, precision_m: data.accuracy });
  if (result.error) throw new Error("A localização já não pode ser atualizada nesta entrega.");
  return true;
});

export const authorizeCourier = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (!role.data) throw new Error("Sem acesso.");
  const profile = await context.supabase.from("matturo_profiles").select("id").eq("id", data.userId).single();
  if (profile.error) throw profile.error;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result = await supabaseAdmin.from("matturo_user_roles").upsert({ user_id: data.userId, role: "courier" });
  if (result.error) throw result.error;
  return true;
});

export const issueTrackingLink = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input) => idSchema.parse(input)).handler(async ({ data, context }) => {
  const role = await context.supabase.rpc("matturo_has_role", { wanted: "admin" });
  if (!role.data) throw new Error("Sem acesso.");
  const delivery = await context.supabase.from("matturo_deliveries").select("id").eq("id", data.id).single();
  if (delivery.error) throw delivery.error;
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const revoked = await supabaseAdmin.from("matturo_tracking_links").update({ revoked_at: new Date().toISOString() }).eq("delivery_id", data.id).is("revoked_at", null);
  if (revoked.error) throw revoked.error;
  const inserted = await supabaseAdmin.from("matturo_tracking_links").insert({ delivery_id: data.id, token_hash: await tokenHash(token), expires_at: new Date(Date.now() + 86400000).toISOString() });
  if (inserted.error) throw inserted.error;
  return { token };
});

export const customerTracking = createServerFn({ method: "POST" }).inputValidator((input) => z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input)).handler(async ({ data }) => {
  setResponseHeader("Cache-Control", "no-store");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const link = await supabaseAdmin.from("matturo_tracking_links").select("delivery_id,expires_at,revoked_at").eq("token_hash", await tokenHash(data.token)).maybeSingle();
  if (!link.data || !validTrackingLink(link.data.expires_at, link.data.revoked_at)) throw new Error("Link inválido ou expirado.");
  const delivery = await supabaseAdmin.from("matturo_deliveries").select("reference,destination,destination_lat,destination_lng,status,updated_at").eq("id", link.data.delivery_id).single();
  if (delivery.error) throw delivery.error;
  const position = delivery.data.status === "active" ? await supabaseAdmin.from("matturo_delivery_positions").select("latitude,longitude,recorded_at").eq("delivery_id", link.data.delivery_id).maybeSingle() : null;
  return { delivery: { ...delivery.data, destination: delivery.data.destination.split(" — ")[0] }, position: position?.data ?? null };
});

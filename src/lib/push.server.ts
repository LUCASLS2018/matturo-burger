// Server-only: builds and sends the customer's web-push alerts through the
// Lovable connector gateway. Never import this file from browser code.
import { orderNumber } from "./order-number";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export type PushMessage = { title: string; body: string };

type OrderForPush = {
  status: string;
  service: string;
  reference: string;
  daily_number?: number | null;
  order_day?: string | null;
};

/** True when the push service is connected; alerts are simply skipped when it is not. */
export function pushReady() {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["FIREBASE_MESSAGING_API_KEY"]);
}

/** The alert a customer sees for a given order state; null when there is nothing to say. */
export function orderPushMessage(
  order: OrderForPush,
  tracking?: { status: string; courier?: string | null } | null,
): PushMessage | null {
  const number = orderNumber(order);
  const courier = tracking?.courier?.trim() || "O estafeta";
  if (tracking?.status === "active") return { title: "O estafeta está a caminho", body: `${courier} está a caminho com o seu pedido #${number}.` };
  if (tracking?.status === "delivered") return { title: "Pedido entregue", body: `O seu pedido #${number} foi entregue. Bom apetite!` };
  if (tracking?.status === "collected") return { title: "Pedido recolhido", body: `${courier} já levou o seu pedido #${number}.` };
  if (tracking?.status === "to_restaurant") return { title: "Estafeta a caminho", body: `${courier} vai passar pelo restaurante para levantar o seu pedido #${number}.` };
  switch (order.status) {
    case "novo":
      return { title: "Pedido recebido", body: `Recebemos o seu pedido #${number}. Vamos confirmá-lo.` };
    case "aceite":
      return { title: "Pedido aceite", body: `O restaurante aceitou o seu pedido #${number}.` };
    case "em_preparacao":
      return { title: "A preparar", body: `O seu pedido #${number} está a ser preparado.` };
    case "pronto":
      return order.service === "Delivery"
        ? { title: "Pedido pronto", body: `O seu pedido #${number} está pronto. Vamos tratar da entrega.` }
        : { title: "Pronto a levantar", body: `O seu pedido #${number} está pronto.` };
    case "concluido":
      return { title: "Pedido concluído", body: `O seu pedido #${number} está concluído. Obrigado pela preferência!` };
    case "cancelado":
      return { title: "Pedido cancelado", body: `O seu pedido #${number} foi cancelado. Fale connosco se tiver dúvidas.` };
    default:
      return null;
  }
}

type SendOutcome = "sent" | "stale" | "failed";

async function sendToToken(token: string, message: PushMessage, path: string): Promise<SendOutcome> {
  const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env["LOVABLE_API_KEY"]}`,
      "X-Connection-Api-Key": process.env["FIREBASE_MESSAGING_API_KEY"] ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: { token, notification: { title: message.title, body: message.body }, data: { path } },
    }),
  });
  if (res.ok) return "sent";
  const detail = await res.text();
  // A registration the provider no longer knows must be forgotten, never retried.
  if (res.status === 404 || (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT/i.test(detail))) return "stale";
  console.error(`Push send failed [${res.status}]: ${detail}`);
  return "failed";
}

/**
 * Alerts every device the customer registered for this order.
 * Returns how many devices were reached; never throws, so an order never fails because of alerts.
 */
export async function notifyOrder(orderId: string): Promise<number> {
  if (!pushReady()) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [order, devices] = await Promise.all([
    supabaseAdmin.from("matturo_orders").select("id,status,service,reference,daily_number,order_day").eq("id", orderId).maybeSingle(),
    supabaseAdmin.from("matturo_push_tokens").select("id,token,path").eq("order_id", orderId),
  ]);
  if (order.error || !order.data || devices.error || !devices.data?.length) return 0;

  const delivery = await supabaseAdmin.from("matturo_deliveries").select("status,courier_id").eq("order_id", orderId).maybeSingle();
  let courier: string | null = null;
  if (delivery.data?.courier_id) {
    const profile = await supabaseAdmin.from("matturo_profiles").select("name").eq("id", delivery.data.courier_id).maybeSingle();
    courier = profile.data?.name?.split(" ")[0] ?? null;
  }

  const message = orderPushMessage(order.data, delivery.data ? { status: delivery.data.status, courier } : null);
  if (!message) return 0;

  const results = await Promise.all(
    devices.data.map(async (device) => ({ id: device.id, outcome: await sendToToken(device.token, message, device.path) })),
  );
  const stale = results.filter((result) => result.outcome === "stale").map((result) => result.id);
  if (stale.length) await supabaseAdmin.from("matturo_push_tokens").delete().in("id", stale);
  return results.filter((result) => result.outcome === "sent").length;
}

/** Alerts the assigned courier's devices that a new delivery was sent to them. Never throws. */
export async function notifyCourier(orderId: string): Promise<number> {
  if (!pushReady()) return 0;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [order, delivery] = await Promise.all([
    supabaseAdmin.from("matturo_orders").select("reference,daily_number,order_day,address,postal_code").eq("id", orderId).maybeSingle(),
    supabaseAdmin.from("matturo_deliveries").select("courier_id").eq("order_id", orderId).maybeSingle(),
  ]);
  if (!order.data || !delivery.data?.courier_id) return 0;
  const devices = await supabaseAdmin.from("matturo_courier_push_tokens").select("id,token").eq("user_id", delivery.data.courier_id);
  if (devices.error || !devices.data?.length) return 0;
  const message = { title: "Nova entrega", body: `Recebeu o pedido #${orderNumber(order.data)} · ${order.data.address ?? ""} ${order.data.postal_code ?? ""}`.trim() };
  const results = await Promise.all(devices.data.map(async (d) => ({ id: d.id, outcome: await sendToToken(d.token, message, "/entregas") })));
  const stale = results.filter((r) => r.outcome === "stale").map((r) => r.id);
  if (stale.length) await supabaseAdmin.from("matturo_courier_push_tokens").delete().in("id", stale);
  return results.filter((r) => r.outcome === "sent").length;
}

export const deliveryLabels: Record<string, string> = {
  confirmed: "Atribuída",
  to_restaurant: "A caminho do restaurante",
  collected: "Pedido recolhido",
  active: "Em entrega",
  delivered: "Entregue",
  cancelled: "Cancelada",
};
export const nextDeliveryState: Record<string, "to_restaurant" | "collected" | "active" | "delivered" | undefined> = {
  confirmed: "to_restaurant",
  to_restaurant: "collected",
  collected: "active",
  active: "delivered",
};
export function trackingActive(status: string) { return status === "active"; }
export function validTrackingLink(expires: string, revoked: string | null, now = Date.now()) { return !revoked && Date.parse(expires) > now; }
export async function tokenHash(token: string) { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)); return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

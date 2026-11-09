import { normalizePhone } from "./customers";

export const REWARD_POINTS = 100;
export const REWARD_SLUG = "hamburguinho";

type PointOrder = { subtotal_cents: number; status: string };
type Redemption = { points: number; order_status: string };

/** 1 point per whole euro spent on products (delivery fee excluded) in completed orders; redemptions on non-cancelled orders are debited. */
export function loyaltyBalance(orders: PointOrder[], redemptions: Redemption[]) {
  const earned = orders.filter((o) => o.status === "concluido").reduce((s, o) => s + Math.floor(o.subtotal_cents / 100), 0);
  const spent = redemptions.filter((r) => r.order_status !== "cancelado").reduce((s, r) => s + r.points, 0);
  return { earned, spent, available: Math.max(0, earned - spent) };
}

type PhoneOrder = PointOrder & { customer_name: string; customer_phone: string };
type PhoneRedemption = Redemption & { phone: string; at: string; reference: string };

/** Guest and signed-in orders contribute to the same telephone wallet. Admin-only projection. */
export function groupPhoneLoyalty(orders: PhoneOrder[], redemptions: PhoneRedemption[]) {
  const wallets = new Map<string, PhoneOrder[]>();
  for (const order of orders) {
    const phone = normalizePhone(order.customer_phone);
    if (!phone) continue;
    const own = wallets.get(phone) ?? [];
    own.push(order);
    wallets.set(phone, own);
  }
  return [...wallets].map(([phone, own]) => {
    const latest = own[0];
    const used = redemptions.filter((redemption) => normalizePhone(redemption.phone) === phone);
    return {
      id: phone, phone: latest?.customer_phone ?? phone, name: latest?.customer_name ?? "",
      ...loyaltyBalance(own, used),
      redemptions: used.map((redemption) => ({ at: redemption.at, reference: redemption.reference, cancelled: redemption.order_status === "cancelado" })),
    };
  }).sort((a, b) => b.available - a.available);
}

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

import type { OrderService } from "./order-service";

/** Display order of the service groups inside the admin order boards. */
export const serviceGroupOrder: OrderService[] = ["Delivery", "Retirada", "Comer no local"];

/** Oldest order first, so the queue reads top-down in the order it arrived. */
export function oldestFirst<T extends { created_at: string }>(orders: readonly T[]): T[] {
  return [...orders].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/** Split orders into one group per service, keeping the oldest-first order inside each. */
export function groupByService<T extends { service: string }>(orders: readonly T[]) {
  return serviceGroupOrder
    .map((service) => ({ service, orders: orders.filter((order) => order.service === service) }))
    .filter((group) => group.orders.length > 0);
}

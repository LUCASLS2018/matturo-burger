export const orderServices = ["Retirada", "Delivery"] as const;
// Historical dine-in orders remain readable, but cannot be selected for new orders.
export type OrderService = typeof orderServices[number] | "Comer no local";
export function needsDeliveryAddress(service: OrderService) {
  return service === "Delivery";
}
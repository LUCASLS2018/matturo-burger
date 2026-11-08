export const orderServices = ["Retirada", "Delivery", "Comer no local"] as const;
export type OrderService = typeof orderServices[number];
export function needsDeliveryAddress(service: OrderService) {
  return service === "Delivery";
}
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";
import type { OrderService } from "./order-service";

export const DELIVERY_REWARD_MINIMUM_CENTS = 700;
export const DELIVERY_REWARD_MINIMUM_MESSAGE = "Para resgatar a oferta no delivery, adicione pelo menos 7 € em produtos pagos, sem contar a entrega.";

export function meetsRewardMinimum(service: OrderService, hasReward: boolean, paidProductCents: number) {
  return service !== "Delivery" || !hasReward || paidProductCents >= DELIVERY_REWARD_MINIMUM_CENTS;
}

export function canonicalPhone(value: string) {
  const trimmed = value.trim().replace(/^00/, "+");
  const phone = parsePhoneNumberFromString(trimmed, "PT");
  if (!phone?.isValid()) throw new Error("Indique um telemóvel válido, com indicativo para números estrangeiros.");
  return phone.number;
}
export const loyaltyPhoneSchema = z.string().trim().max(30).transform(canonicalPhone);
export const loyaltySessionSchema = z.string().regex(/^[a-f0-9]{64}$/);

export function rewardUnitPrice(unitCents: number, baseCents: number) {
  return Math.max(0, unitCents - baseCents);
}
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import { z } from "zod";

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

export const REWARD_MINIMUM_CENTS = 700;
export const REWARD_MINIMUM_MESSAGE = "Para resgatar a oferta, precisa de pelo menos 7 € em produtos pagos, sem contar os portes nem o Hamburguinho grátis.";

export function meetsRewardMinimum(hasReward: boolean, paidProductsCents: number) {
  return !hasReward || paidProductsCents >= REWARD_MINIMUM_CENTS;
}
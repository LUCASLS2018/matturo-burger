/** Loyalty rewards catalog. Prices and lines are always applied on the server. */
export type LoyaltyReward = {
  id: string;
  points: number;
  label: string;
  /** Free lines added to the order (redemption-only, price 0). */
  freeItems?: string[];
  /** Discount on paid products, in cents. */
  discountCents?: number;
};

export const LOYALTY_REWARDS: LoyaltyReward[] = [
  { id: "batata-cheddar-bacon", points: 50, label: "Batata cheddar e bacon", freeItems: ["Batata cheddar e bacon"] },
  { id: "batata-cheddar-carne", points: 55, label: "Batata cheddar e carne", freeItems: ["Batata cheddar e carne"] },
  { id: "hamburguinho-batata", points: 75, label: "Hamburguinho + batata", freeItems: ["Hamburguinho", "Batata"] },
  { id: "matturo-batata", points: 100, label: "Matturo + batata", freeItems: ["Hambúrguer Matturo", "Batata"] },
  { id: "triplo-batata", points: 150, label: "Triplo + batata", freeItems: ["Hambúrguer Triplo Overdose", "Batata"] },
  { id: "desconto-5", points: 100, label: "Desconto de 5 €", discountCents: 500 },
  { id: "desconto-15", points: 300, label: "Desconto de 15 €", discountCents: 1500 },
];

export const MIN_REWARD_POINTS = Math.min(...LOYALTY_REWARDS.map((r) => r.points));

export function findReward(id: string | null | undefined) {
  return LOYALTY_REWARDS.find((r) => r.id === id) ?? null;
}

/** Paid product cents after applying the reward's discount (never below zero). */
export function paidAfterReward(reward: LoyaltyReward | null, productsCents: number) {
  return Math.max(0, productsCents - (reward?.discountCents ?? 0));
}

export function rewardLines(reward: LoyaltyReward) {
  return (reward.freeItems ?? []).map((name) => ({
    dish_id: `recompensa:${reward.id}`, name: `${name} (GRÁTIS · fidelização)`, options: {}, unit_price_cents: 0, qty: 1, line_total_cents: 0,
  }));
}

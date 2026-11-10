import { describe, expect, it } from "vitest";
import { findReward, LOYALTY_REWARDS, MIN_REWARD_POINTS, paidAfterReward, rewardLines } from "./loyalty-rewards";
import { meetsRewardMinimum } from "./loyalty-phone";

const pts = (id: string) => findReward(id)?.points;
describe("loyalty rewards catalog", () => {
  it("uses the points the restaurant defined", () => {
    expect(pts("batata-cheddar-bacon")).toBe(50);
    expect(pts("batata-cheddar-carne")).toBe(55);
    expect(pts("hamburguinho-batata")).toBe(75);
    expect(pts("matturo-batata")).toBe(100);
    expect(pts("triplo-batata")).toBe(150);
    expect(pts("desconto-5")).toBe(100);
    expect(pts("desconto-15")).toBe(300);
    expect(LOYALTY_REWARDS).toHaveLength(7);
    expect(MIN_REWARD_POINTS).toBe(50);
  });
  it("discounts 5 € and 15 € from paid products", () => {
    expect(paidAfterReward(findReward("desconto-5"), 1500)).toBe(1000);
    expect(paidAfterReward(findReward("desconto-15"), 2000)).toBe(500);
  });
  it("still requires 7 € paid after the discount", () => {
    expect(meetsRewardMinimum(true, paidAfterReward(findReward("desconto-5"), 1199))).toBe(false);
    expect(meetsRewardMinimum(true, paidAfterReward(findReward("desconto-5"), 1200))).toBe(true);
  });
  it("adds free items at zero price", () => {
    const lines = rewardLines(findReward("hamburguinho-batata")!);
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.line_total_cents === 0)).toBe(true);
  });
  it("rejects unknown rewards", () => { expect(findReward("x")).toBeNull(); });
});

import { describe, expect, it } from "vitest";
import { canonicalPhone, rewardUnitPrice, meetsRewardMinimum } from "./loyalty-phone";

describe("secure telephone loyalty rules", () => {
  it("unifies the Portuguese number with international format", () => {
    expect(canonicalPhone("912 345 678")).toBe("+351912345678");
    expect(canonicalPhone("00351 912 345 678")).toBe("+351912345678");
  });
  it("does not merge a foreign number with a Portuguese wallet", () => {
    expect(canonicalPhone("+44 7911 123456")).not.toBe("+351912345678");
  });
  it("rejects an invalid telephone", () => {
    expect(() => canonicalPhone("123")).toThrow();
  });
  it("makes the Hamburguinho base free while keeping extra prices", () => {
    expect(rewardUnitPrice(650, 500)).toBe(150);
    expect(rewardUnitPrice(500, 500)).toBe(0);
  });
  it("requires 7 euros in paid products for delivery rewards, excluding delivery fees", () => {
    expect(meetsRewardMinimum("Delivery", true, 0)).toBe(false);
    expect(meetsRewardMinimum("Delivery", true, 699)).toBe(false);
    expect(meetsRewardMinimum("Delivery", true, 700)).toBe(true);
    expect(meetsRewardMinimum("Delivery", true, 701)).toBe(true);
  });
  it("does not impose the reward minimum on pickup or dining in", () => {
    expect(meetsRewardMinimum("Retirada", true, 0)).toBe(true);
    expect(meetsRewardMinimum("Comer no local", true, 0)).toBe(true);
  });
  it("does not impose the reward minimum on ordinary delivery orders", () => {
    expect(meetsRewardMinimum("Delivery", false, 699)).toBe(true);
  });
});
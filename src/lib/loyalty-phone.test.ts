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
  it("requires at least 7 euros in paid products for any reward order", () => {
    expect(meetsRewardMinimum(true, 699)).toBe(false);
    expect(meetsRewardMinimum(true, 700)).toBe(true);
    expect(meetsRewardMinimum(true, 701)).toBe(true);
  });
  it("does not impose the reward minimum on ordinary orders", () => {
    expect(meetsRewardMinimum(false, 500)).toBe(true);
  });
});
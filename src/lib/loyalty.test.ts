import { describe, expect, it } from "vitest";
import { loyaltyBalance } from "./loyalty";

describe("loyaltyBalance", () => {
  it("gives 1 point per euro of products in completed orders only", () => {
    expect(loyaltyBalance([{ subtotal_cents: 1250, status: "concluido" }, { subtotal_cents: 5000, status: "novo" }], []).available).toBe(12);
  });
  it("debits 100 points per redemption", () => {
    expect(loyaltyBalance([{ subtotal_cents: 15000, status: "concluido" }], [{ points: 100, order_status: "novo" }]).available).toBe(50);
  });
  it("returns points when the redemption order is cancelled", () => {
    expect(loyaltyBalance([{ subtotal_cents: 15000, status: "concluido" }], [{ points: 100, order_status: "cancelado" }]).available).toBe(150);
  });
});

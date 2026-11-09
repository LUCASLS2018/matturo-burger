import { describe, expect, it } from "vitest";
import { groupPhoneLoyalty, loyaltyBalance } from "./loyalty";

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

describe("telephone loyalty", () => {
  it("accumulates guest orders automatically without a customer account", () => {
    const wallets = groupPhoneLoyalty([
      { customer_name: "Cliente", customer_phone: "912345678", subtotal_cents: 6000, status: "concluido" },
      { customer_name: "Cliente", customer_phone: "+351 912 345 678", subtotal_cents: 4000, status: "concluido" },
    ], []);
    expect(wallets).toHaveLength(1);
    expect(wallets[0]?.available).toBe(100);
  });
  it("keeps different telephone wallets separate", () => {
    const wallets = groupPhoneLoyalty([
      { customer_name: "Mesmo nome", customer_phone: "912345678", subtotal_cents: 10000, status: "concluido" },
      { customer_name: "Mesmo nome", customer_phone: "923456789", subtotal_cents: 2000, status: "concluido" },
    ], []);
    expect(wallets.map((wallet) => wallet.available)).toEqual([100, 20]);
  });
  it("preserves the 100 point debit on the telephone of an existing redemption", () => {
    const wallets = groupPhoneLoyalty([
      { customer_name: "Cliente", customer_phone: "912345678", subtotal_cents: 15000, status: "concluido" },
    ], [{ phone: "+351 912345678", points: 100, order_status: "novo", at: "2026-11-09", reference: "M1" }]);
    expect(wallets[0]?.available).toBe(50);
  });
});

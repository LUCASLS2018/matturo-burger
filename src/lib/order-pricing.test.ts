import { describe, expect, it } from "vitest";
import { dishes } from "./menu";
import { canMoveOrder, priceLine } from "./order-pricing";

const burger = dishes.find((d) => d.name.toLowerCase().includes("matturo") && d.price === 8)!;

describe("order pricing", () => {
  it("uses the menu price, not the browser price", () => {
    const required = burger.groups.filter((g) => g.required);
    const options = Object.fromEntries(required.map((g) => [g.name, `${g.min}× ${g.modifiers.find((m) => m.price === 0)?.name ?? g.modifiers[0].name}`]));
    const line = priceLine({ productId: burger.id, qty: 2, options });
    expect(line.unit_price_cents).toBeGreaterThanOrEqual(800);
    expect(line.line_total_cents).toBe(line.unit_price_cents * 2);
  });
  it("rejects unknown products and invalid quantities", () => {
    expect(() => priceLine({ productId: "nope", qty: 1, options: {} })).toThrow();
    expect(() => priceLine({ productId: burger.id, qty: 0, options: {} })).toThrow();
  });
  it("only allows forward status changes", () => {
    expect(canMoveOrder("novo", "aceite")).toBe(true);
    expect(canMoveOrder("concluido", "novo")).toBe(false);
  });
});

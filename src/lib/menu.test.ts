import { describe, expect, it } from "vitest";
import { dishes, dishTotal, selectionValid } from "./menu";
describe("Original Matturo menu", () => {
  it("preserves the exact original Matturo burger price", () => {
    const dish = dishes.find(p => p.slug === "hamburguer-matturo");
    expect(dish?.price).toBe(8);
  });
  it("does not accept a burger without its required selection", () => {
    const dish = dishes.find(p => p.slug === "hamburguer-matturo");
    if (!dish) throw new Error("Missing original burger");
    expect(selectionValid(dish, {})).toBe(false);
  });
  it("uses the original combo fries supplement", () => {
    const dish = dishes.find(p => p.slug === "combo-2-hamburguinho");
    if (!dish) throw new Error("Missing original combo");
    const fries = dish.groups.flatMap(g => g.modifiers).find(m => m.name === "1 dose de batata frita");
    if (!fries) throw new Error("Missing fries option");
    expect(fries.price).toBe(1.5);
    expect(dishTotal(dish, { [fries.id]: 1 })).toBe(11.49);
  });
});
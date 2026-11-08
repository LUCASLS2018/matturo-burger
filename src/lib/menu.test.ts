import { describe, expect, it } from "vitest";
import { dishes, dishTotal, menuItemToDish, selectionValid } from "./menu";
import { priceLine } from "./order-pricing";
describe("Original Matturo menu", () => {
  it("preserves the exact original Matturo burger price", () => {
    const dish = dishes.find(p => p.slug === "hamburguer-matturo");
    expect(dish?.price).toBe(8);
  });
  it("does not accept a combo without its required fries selection", () => {
    const dish = dishes.find(p => p.slug === "combo-2-hamburguinho");
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
  it("uses an edited database price for new orders and preserves the original options", () => {
    const original = dishes.find(p => p.slug === "hamburguer-matturo");
    if (!original) throw new Error("Missing original burger");
    const edited = menuItemToDish({
      id: original.id,
      name: original.name,
      slug: original.slug,
      description: original.description,
      category: original.category,
      price_cents: 925,
      image: original.image,
      available: true,
      visible: true,
    });
    expect(edited.groups).toEqual(original.groups);
    expect(priceLine({ productId: original.id, qty: 1, options: {} }, [edited]).unit_price_cents).toBe(925);
  });
});
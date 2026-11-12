import { expect, it } from "vitest";
import { discountedPrice } from "./site-discount";
it("10% off a 10 € burger is 9 €", () => { expect(discountedPrice(10, "hamburguer", 10)).toBe(9); });
it("promotion items keep their price", () => { expect(discountedPrice(10, "promocoes", 10)).toBe(10); });
it("no discount when inactive", () => { expect(discountedPrice(7.5, "pizzas", 0)).toBe(7.5); });

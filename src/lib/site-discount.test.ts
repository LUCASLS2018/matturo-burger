import { expect, it } from "vitest";
import { discountedPrice } from "./site-discount";
it("10% off a 10 € burger is 9 €", () => { expect(discountedPrice(10, "hamburguer", 10)).toBe(9); });
it("promotion items keep their price", () => { expect(discountedPrice(10, "promocoes", 10)).toBe(10); });
it("no discount when inactive", () => { expect(discountedPrice(7.5, "pizzas", 0)).toBe(7.5); });
import { describe as d2, expect as e2, it as i2 } from "vitest";
import { discountedPrice as dp, effectiveDiscount as ed } from "./site-discount";
d2("desconto individual", () => {
  i2("o desconto do produto substitui o geral", () => { e2(ed("hamburgueres", 10, 25)).toBe(25); e2(dp(10, "hamburgueres", 10, 25)).toBe(7.5); });
  i2("aplica-se também a produtos das Promoções", () => { e2(dp(10, "promocoes", 10, 20)).toBe(8); });
  i2("sem desconto próprio, mantém o geral", () => { e2(dp(10, "hamburgueres", 10, 0)).toBe(9); });
});

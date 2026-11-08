import { describe, expect, it } from "vitest";
import { resolvePurchasedItems } from "./stripe.server";

const products = [{ id: "product-1", name: "Caneca", price: 30 }];
const variations = [{ id: "variation-1", product_id: "product-1", price: 32.5 }];
const options = [{ variation_id: "variation-1", attribute_name: "TIME", option: "BENFICA" }];

describe("resolvePurchasedItems", () => {
  it("uses the published variation price and converts EUR to cents", () => {
    const result = resolvePurchasedItems([{ productId: "product-1", qty: 2, options: { TIME: "BENFICA" } }], products, variations, options);
    expect(result).toEqual([{ name: "Caneca — Time: BENFICA", unitAmount: 3250, quantity: 2 }]);
  });

  it("rejects an unavailable variation combination", () => {
    expect(() => resolvePurchasedItems([{ productId: "product-1", qty: 1, options: { TIME: "PORTO" } }], products, variations, options)).toThrow();
  });

  it("rejects products that were not returned as published", () => {
    expect(() => resolvePurchasedItems([{ productId: "missing", qty: 1, options: {} }], products, variations, options)).toThrow();
  });
});

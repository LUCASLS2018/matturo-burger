import { describe, expect, it } from "vitest";
import { checkoutDefaults, checkoutSchema } from "./checkout";

const validCheckout = {
  ...checkoutDefaults,
  name: "Lucas Silva",
  email: "lucas@example.com",
  phone: "+351 912 345 678",
  address: "Rua Principal, 10",
  postalCode: "2600-000",
  city: "Vila Franca de Xira",
};

describe("checkoutSchema", () => {
  it("requires identification and delivery details", () => {
    const result = checkoutSchema.safeParse(checkoutDefaults);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toMatchObject({
        name: expect.any(Array),
        email: expect.any(Array),
        phone: expect.any(Array),
        address: expect.any(Array),
        postalCode: expect.any(Array),
        city: expect.any(Array),
      });
    }
  });

  it("accepts valid delivery details and optional notes", () => {
    expect(checkoutSchema.safeParse(validCheckout).success).toBe(true);
    expect(checkoutSchema.safeParse({ ...validCheckout, address2: "2.º esquerdo", notes: "Entregar durante a tarde" }).success).toBe(true);
  });

  it("rejects malformed email, phone and postal code", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, email: "email-invalido" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, phone: "123" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, postalCode: "@" }).success).toBe(false);
  });
});

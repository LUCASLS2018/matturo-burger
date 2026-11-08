import { describe, expect, it } from "vitest";
import { groupCustomers } from "./customers";

const row = (o: Partial<Parameters<typeof groupCustomers>[0][number]>) => ({
  reference: "R", customer_name: "Ana", customer_phone: "912345678", address: null, postal_code: null,
  service: "Retirada", total_cents: 1000, status: "concluido", created_at: "2026-11-01T10:00:00Z", ...o,
});

describe("groupCustomers", () => {
  it("sums spending per phone and excludes cancelled orders", () => {
    const c = groupCustomers([
      row({ total_cents: 1000 }),
      row({ customer_phone: "+351 912 345 678", total_cents: 2500, created_at: "2026-11-05T10:00:00Z" }),
      row({ total_cents: 9900, status: "cancelado" }),
    ])[0]!;
    expect(c.orders).toBe(2);
    expect(c.spentCents).toBe(3500);
    expect(c.lastAt).toBe("2026-11-05T10:00:00Z");
  });
  it("uses the most recent delivery address", () => {
    const c = groupCustomers([
      row({ address: "Rua Velha", created_at: "2026-11-01T10:00:00Z" }),
      row({ address: "Rua Nova", postal_code: "2600-162", created_at: "2026-11-03T10:00:00Z" }),
    ])[0]!;
    expect(c.address).toBe("Rua Nova");
  });
});

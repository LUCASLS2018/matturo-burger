import { describe, expect, it } from "vitest";
import { lisbonOrderDay, orderNumber } from "./order-number";

describe("Daily order numbers", () => {
  it("shows 1 for the first order, retaining its permanent reference", () => {
    const order = { reference: "M-STABLE", daily_number: 1, order_day: "2026-11-09" };
    expect(orderNumber(order)).toBe("1");
    expect(order.reference).toBe("M-STABLE");
  });
  it("shows the sequential second number", () => {
    expect(orderNumber({ reference: "M-SECOND", daily_number: 2 })).toBe("2");
  });
  it("can show 1 again on the next day without conflating references", () => {
    expect(orderNumber({ reference: "M-NEXT", daily_number: 1, order_day: "2026-11-10" })).toBe("1");
  });
  it("uses Portugal midnight in winter", () => {
    expect(lisbonOrderDay(new Date("2026-11-09T23:59:59Z"))).toBe("2026-11-09");
    expect(lisbonOrderDay(new Date("2026-11-10T00:00:00Z"))).toBe("2026-11-10");
  });
  it("uses Portugal midnight in summer", () => {
    expect(lisbonOrderDay(new Date("2026-07-01T22:59:59Z"))).toBe("2026-07-01");
    expect(lisbonOrderDay(new Date("2026-07-01T23:00:00Z"))).toBe("2026-07-02");
  });
});
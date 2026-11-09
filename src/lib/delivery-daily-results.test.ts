import { describe, expect, it } from "vitest";
import { summarizeDailyResults } from "./delivery-daily-results";

const profiles = [{ id: "ana", name: "Ana" }, { id: "bruno", name: "Bruno" }];

const rows = [
  // Same Lisbon calendar day, two hours apart.
  { courier_id: "ana", completed_at: "2026-11-07T21:30:00Z", matturo_orders: { total_cents: 1500 } },
  { courier_id: "ana", completed_at: "2026-11-07T22:30:00Z", matturo_orders: { total_cents: 2500 } },
  { courier_id: "bruno", completed_at: "2026-11-07T23:30:00Z", matturo_orders: { total_cents: 1000 } },
  // A day earlier.
  { courier_id: "bruno", completed_at: "2026-11-06T12:00:00Z", matturo_orders: { total_cents: 3000 } },
  // Delivery without an order, and a delivery with no courier.
  { courier_id: null, completed_at: "2026-11-06T13:00:00Z", matturo_orders: null },
];

describe("summarizeDailyResults", () => {
  const results = summarizeDailyResults(rows, profiles);

  it("puts the newest day first", () => {
    expect(results.map((day) => day.day)).toEqual(["2026-11-07", "2026-11-06"]);
  });

  it("totals each day's deliveries and value", () => {
    expect(results[0]).toMatchObject({ deliveries: 3, valueCents: 5000 });
    expect(results[1]).toMatchObject({ deliveries: 2, valueCents: 3000 });
  });

  it("splits each day per courier", () => {
    expect(results[0].couriers).toEqual([
      { id: "ana", name: "Ana", deliveries: 2, valueCents: 4000 },
      { id: "bruno", name: "Bruno", deliveries: 1, valueCents: 1000 },
    ]);
  });

  it("keeps a delivery without a courier visible as sem estafeta", () => {
    expect(results[1].couriers).toContainEqual({ id: "sem-estafeta", name: "Sem estafeta", deliveries: 1, valueCents: 0 });
  });

  it("shows nothing when there are no completed deliveries", () => {
    expect(summarizeDailyResults([], profiles)).toEqual([]);
  });
});

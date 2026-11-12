import { describe, expect, it } from "vitest";
import { summarizeDailySources } from "./daily-sources";

describe("summarizeDailySources", () => {
  const r = summarizeDailySources([
    { order_day: "2026-11-11", source: "web", total_cents: 1000 },
    { order_day: "2026-11-12", source: "app", total_cents: 500 },
    { order_day: "2026-11-12", source: "telefone", total_cents: 700 },
    { order_day: "2026-11-12", source: "web", total_cents: 300 },
  ]);
  it("separates days, newest first", () => expect(r.map((d) => d.day)).toEqual(["2026-11-12", "2026-11-11"]));
  it("splits each day by origin", () => {
    expect(r[0]!.sources).toEqual([
      { source: "app", orders: 1, valueCents: 500 },
      { source: "web", orders: 1, valueCents: 300 },
      { source: "telefone", orders: 1, valueCents: 700 },
    ]);
    expect(r[1]!.sources.find((s) => s.source === "web")?.orders).toBe(1);
  });
});

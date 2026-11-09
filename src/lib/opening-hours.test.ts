import { describe, expect, it } from "vitest";
import { canAcceptOrders, canAcceptScheduledOrder, isRestaurantOpen, lisbonDateTimeToDate, scheduledOrderError } from "./opening-hours";

describe("Matturo opening hours in Europe/Lisbon", () => {
  it("stays closed all Monday", () => {
    expect(isRestaurantOpen(new Date("2026-11-09T12:00:00Z"))).toBe(false);
    expect(isRestaurantOpen(new Date("2026-11-09T19:30:00Z"))).toBe(false);
  });

  it("accepts orders at both opening instants on Tuesday", () => {
    expect(isRestaurantOpen(new Date("2026-11-10T12:00:00Z"))).toBe(true);
    expect(isRestaurantOpen(new Date("2026-11-10T19:00:00Z"))).toBe(true);
  });

  it("refuses orders between lunch and dinner", () => {
    expect(isRestaurantOpen(new Date("2026-11-10T15:00:00Z"))).toBe(false);
    expect(isRestaurantOpen(new Date("2026-11-10T18:59:59Z"))).toBe(false);
  });

  it("refuses orders exactly at each closing instant", () => {
    expect(isRestaurantOpen(new Date("2026-11-10T14:59:59Z"))).toBe(true);
    expect(isRestaurantOpen(new Date("2026-11-10T15:00:00Z"))).toBe(false);
    expect(isRestaurantOpen(new Date("2026-11-10T21:44:59Z"))).toBe(true);
    expect(isRestaurantOpen(new Date("2026-11-10T21:45:00Z"))).toBe(false);
  });

  it("opens on Sunday and uses Portugal summer time correctly", () => {
    expect(isRestaurantOpen(new Date("2026-11-15T11:59:59Z"))).toBe(false);
    expect(isRestaurantOpen(new Date("2026-11-15T12:00:00Z"))).toBe(true);
    expect(isRestaurantOpen(new Date("2026-07-14T10:59:59Z"))).toBe(false);
    expect(isRestaurantOpen(new Date("2026-07-14T11:00:00Z"))).toBe(true);
  });

  it("does not allow ordering while closed or manually paused", () => {
    const open = new Date("2026-11-10T12:30:00Z");
    const closed = new Date("2026-11-10T16:00:00Z");
    expect(canAcceptOrders(false, open)).toBe(true);
    expect(canAcceptOrders(true, open)).toBe(false);
    expect(canAcceptOrders(false, closed)).toBe(false);
  });

  it("converts the chosen time from Portugal in winter and summer", () => {
    expect(lisbonDateTimeToDate("2026-11-10T12:00")?.toISOString()).toBe("2026-11-10T12:00:00.000Z");
    expect(lisbonDateTimeToDate("2026-07-14T12:00")?.toISOString()).toBe("2026-07-14T11:00:00.000Z");
  });

  it("rejects a scheduled time before now", () => {
    const now = new Date("2026-11-10T11:00:00Z");
    expect(scheduledOrderError("2026-11-10T10:59:00Z", now)).toMatch("futuras");
  });

  it("rejects a scheduled time before opening or after closing", () => {
    const now = new Date("2026-11-09T03:00:00Z");
    expect(scheduledOrderError("2026-11-10T11:59:00Z", now)).toMatch("dentro do horário");
    expect(scheduledOrderError("2026-11-10T21:45:00Z", now)).toMatch("dentro do horário");
  });

  it("allows a future scheduled time inside opening hours", () => {
    const now = new Date("2026-11-09T03:00:00Z");
    expect(scheduledOrderError("2026-11-10T12:00:00Z", now)).toBeNull();
    expect(scheduledOrderError("2026-11-10T19:30:00Z", now)).toBeNull();
  });

  it("rejects a nonexistent Portugal local time at the DST change", () => {
    expect(lisbonDateTimeToDate("2026-03-29T01:30")).toBeNull();
  });
});

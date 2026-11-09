import { describe, expect, it } from "vitest";
import { summarizeCourierDeliveries } from "./courier-delivery-stats";

const profiles = [
  { id: "ana", name: "Ana" },
  { id: "bruno", name: "Bruno" },
  { id: "carla", name: "Carla" },
];

const NOW = new Date("2026-11-09T20:00:00Z");
const deliveries = [
  { courier_id: "ana", status: "delivered", completed_at: "2026-11-09T10:00:00Z" },
  { courier_id: "ana", status: "delivered", completed_at: "2026-11-09T10:00:00Z" },
  { courier_id: "ana", status: "active" },
  { courier_id: "ana", status: "cancelled" },
  { courier_id: "bruno", status: "delivered", completed_at: "2026-11-09T10:00:00Z" },
  { courier_id: "bruno", status: "confirmed" },
];

describe("summarizeCourierDeliveries", () => {
  it("counts each courier's completed deliveries separately", () => {
    const stats = summarizeCourierDeliveries(["ana", "bruno", "carla"], profiles, deliveries, NOW);
    expect(stats.find((courier) => courier.id === "ana")?.delivered).toBe(2);
    expect(stats.find((courier) => courier.id === "bruno")?.delivered).toBe(1);
  });

  it("keeps active work separate and excludes cancellations from completed deliveries", () => {
    const stats = summarizeCourierDeliveries(["ana", "bruno"], profiles, deliveries, NOW);
    expect(stats.find((courier) => courier.id === "ana")).toMatchObject({ active: 1, delivered: 2 });
    expect(stats.find((courier) => courier.id === "bruno")).toMatchObject({ active: 1, delivered: 1 });
  });

  it("shows registered couriers even when they have never completed a delivery", () => {
    const stats = summarizeCourierDeliveries(["carla"], profiles, deliveries);
    expect(stats.find((courier) => courier.id === "carla")).toEqual({ id: "carla", name: "Carla", active: 0, delivered: 0 });
  });

  it("resets completed counts at Lisbon midnight", () => {
    const rows = [{ courier_id: "ana", status: "delivered", completed_at: "2026-11-08T23:30:00Z" }, { courier_id: "ana", status: "delivered", completed_at: "2026-11-09T00:10:00Z" }];
    expect(summarizeCourierDeliveries(["ana"], profiles, rows, NOW)[0]?.delivered).toBe(1);
    expect(summarizeCourierDeliveries(["ana"], profiles, rows, new Date("2026-11-10T09:00:00Z"))[0]?.delivered).toBe(0);
  });
});

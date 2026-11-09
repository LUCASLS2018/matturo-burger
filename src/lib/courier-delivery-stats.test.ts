import { describe, expect, it } from "vitest";
import { summarizeCourierDeliveries } from "./courier-delivery-stats";

const profiles = [
  { id: "ana", name: "Ana" },
  { id: "bruno", name: "Bruno" },
  { id: "carla", name: "Carla" },
];

const deliveries = [
  { courier_id: "ana", status: "delivered" },
  { courier_id: "ana", status: "delivered" },
  { courier_id: "ana", status: "active" },
  { courier_id: "ana", status: "cancelled" },
  { courier_id: "bruno", status: "delivered" },
  { courier_id: "bruno", status: "confirmed" },
];

describe("summarizeCourierDeliveries", () => {
  it("counts each courier's completed deliveries separately", () => {
    const stats = summarizeCourierDeliveries(["ana", "bruno", "carla"], profiles, deliveries);
    expect(stats.find((courier) => courier.id === "ana")?.delivered).toBe(2);
    expect(stats.find((courier) => courier.id === "bruno")?.delivered).toBe(1);
  });

  it("keeps active work separate and excludes cancellations from completed deliveries", () => {
    const stats = summarizeCourierDeliveries(["ana", "bruno"], profiles, deliveries);
    expect(stats.find((courier) => courier.id === "ana")).toMatchObject({ active: 1, delivered: 2 });
    expect(stats.find((courier) => courier.id === "bruno")).toMatchObject({ active: 1, delivered: 1 });
  });

  it("shows registered couriers even when they have never completed a delivery", () => {
    const stats = summarizeCourierDeliveries(["carla"], profiles, deliveries);
    expect(stats).toEqual([{ id: "carla", name: "Carla", active: 0, delivered: 0 }]);
  });
});

import { describe, expect, it } from "vitest";
import { groupByService, oldestFirst } from "./order-groups";

const orders = [
  { id: "b", service: "Delivery", created_at: "2026-11-09T10:00:00Z" },
  { id: "a", service: "Retirada", created_at: "2026-11-09T09:00:00Z" },
  { id: "c", service: "Delivery", created_at: "2026-11-09T11:00:00Z" },
];

describe("oldestFirst", () => {
  it("puts the oldest order at the top", () => {
    expect(oldestFirst(orders).map((o) => o.id)).toEqual(["a", "b", "c"]);
  });
});

describe("groupByService", () => {
  it("keeps delivery and retirada apart", () => {
    const groups = groupByService(oldestFirst(orders));
    expect(groups.map((g) => g.service)).toEqual(["Delivery", "Retirada"]);
    const [delivery, retirada] = groups;
    expect(delivery?.orders.map((o) => o.id)).toEqual(["b", "c"]);
    expect(retirada?.orders.map((o) => o.id)).toEqual(["a"]);
  });

  it("drops service groups with no orders", () => {
    expect(groupByService(orders.slice(0, 1)).map((g) => g.service)).toEqual(["Delivery"]);
  });
});

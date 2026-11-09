import { describe, expect, it } from "vitest";
import {
  detectOrderSource,
  filterByOrderSource,
  normalizeOrderSource,
  orderSourceCounts,
  orderSourceFromEnvironment,
} from "./order-source";

describe("orderSourceFromEnvironment", () => {
  it("marks an installed app as app", () => {
    expect(orderSourceFromEnvironment({ displayModeStandalone: true, iosStandalone: false })).toBe("app");
    expect(orderSourceFromEnvironment({ displayModeStandalone: false, iosStandalone: true })).toBe("app");
  });

  it("marks a normal browser tab as web", () => {
    expect(orderSourceFromEnvironment({ displayModeStandalone: false, iosStandalone: false })).toBe("web");
  });

  it("detects the order source without a browser", () => {
    expect(detectOrderSource()).toBe("web");
  });
});

describe("normalizeOrderSource", () => {
  it("keeps the three known origins and falls back to web", () => {
    expect(normalizeOrderSource("app")).toBe("app");
    expect(normalizeOrderSource("telefone")).toBe("telefone");
    expect(normalizeOrderSource("")).toBe("web");
    expect(normalizeOrderSource(null)).toBe("web");
    expect(normalizeOrderSource(undefined)).toBe("web");
  });
});

describe("filterByOrderSource", () => {
  const orders = [
    { id: "1", source: "app" },
    { id: "2", source: "web" },
    { id: "3", source: "telefone" },
    { id: "4", source: null },
  ];

  it("keeps only the orders from the chosen origin", () => {
    expect(filterByOrderSource(orders, "app").map((order) => order.id)).toEqual(["1"]);
    expect(filterByOrderSource(orders, "telefone").map((order) => order.id)).toEqual(["3"]);
  });

  it("treats a missing origin as a website order", () => {
    expect(filterByOrderSource(orders, "web").map((order) => order.id)).toEqual(["2", "4"]);
  });

  it("returns every order when the filter is off", () => {
    expect(filterByOrderSource(orders, "todos").map((order) => order.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("counts every origin separately", () => {
    expect(orderSourceCounts(orders)).toEqual({ app: 1, web: 2, telefone: 1 });
  });
});

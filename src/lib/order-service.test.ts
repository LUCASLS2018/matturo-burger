import { describe, expect, it } from "vitest";
import { orderServices, needsDeliveryAddress } from "./order-service";
describe("eat-in orders", () => {
  it("offers Comer no local", () => expect(orderServices).toContain("Comer no local"));
  it("does not require a delivery address for Comer no local", () => expect(needsDeliveryAddress("Comer no local")).toBe(false));
  it("still requires an address for Delivery", () => expect(needsDeliveryAddress("Delivery")).toBe(true));
});
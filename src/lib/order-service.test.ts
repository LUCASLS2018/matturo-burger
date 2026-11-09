import { describe, expect, it } from "vitest";
import { orderServices, needsDeliveryAddress } from "./order-service";
describe("order services", () => {
  it("offers only pickup and delivery for new orders", () => expect(orderServices).toEqual(["Retirada", "Delivery"]));
  it("does not require a delivery address for Comer no local", () => expect(needsDeliveryAddress("Comer no local")).toBe(false));
  it("still requires an address for Delivery", () => expect(needsDeliveryAddress("Delivery")).toBe(true));
});
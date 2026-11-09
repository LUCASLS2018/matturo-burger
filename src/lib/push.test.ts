import { describe, expect, it } from "vitest";
import { orderAlertPath } from "./push";

describe("orderAlertPath", () => {
  it("accepts the customer's own order page", () => {
    expect(orderAlertPath("/pedido/abcdefghij")).toBe(true);
    expect(orderAlertPath("/pedido/abc-123_XY")).toBe(true);
  });

  it("rejects every other address", () => {
    expect(orderAlertPath("/admin")).toBe(false);
    expect(orderAlertPath("/pedido/short")).toBe(false);
    expect(orderAlertPath("/pedido/abc def")).toBe(false);
    expect(orderAlertPath("//evil.example/x")).toBe(false);
    expect(orderAlertPath("https://evil.example/pedido/abcdefghij")).toBe(false);
    expect(orderAlertPath("/pedido/abcdefghij?next=/admin")).toBe(false);
  });
});

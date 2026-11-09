import { describe, expect, it } from "vitest";
import { distanceKm, findRadiusZone, radiusZoneLabel } from "./delivery-radius";

const zones = [
  { name: "Até 5 km", fee_cents: 500, max_distance_km: 5 },
  { name: "Até 3 km", fee_cents: 300, max_distance_km: 3 },
  { name: "Postal", fee_cents: 900, max_distance_km: null },
];

describe("delivery by store radius", () => {
  it("uses the nearest enclosing radius fee", () => {
    expect(findRadiusZone(2.4, zones)).toEqual(zones[1]);
  });

  it("includes the exact configured radius boundary", () => {
    expect(findRadiusZone(3, zones)).toEqual(zones[1]);
  });

  it("uses the next radius when the nearest one is exceeded", () => {
    expect(findRadiusZone(3.01, zones)).toEqual(zones[0]);
  });

  it("refuses delivery beyond every configured radius", () => {
    expect(findRadiusZone(5.01, zones)).toBeNull();
  });

  it("calculates distance from store and customer coordinates", () => {
    const store = { lat: 38.9534874, lng: -8.9883805 };
    expect(distanceKm(store, store)).toBe(0);
    expect(distanceKm(store, { lat: 39.9534874, lng: -8.9883805 })).toBeCloseTo(111.195, 2);
  });

  it("keeps the measured distance with the order zone label", () => {
    expect(radiusZoneLabel("Até 3 km", 2.44)).toBe("Até 3 km · 2,4 km");
  });
});

export type RadiusZone = {
  name: string;
  fee_cents: number;
  max_distance_km: number | null;
};

export type Coordinates = { lat: number; lng: number };

/** Great-circle distance between the store and the customer, in kilometres. */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371.0088;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const lat1 = radians(from.lat);
  const lat2 = radians(to.lat);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The nearest enclosing radius supplies the fee; the boundary itself is included. */
export function findRadiusZone<T extends RadiusZone>(distance: number, zones: readonly T[]): T | null {
  if (!Number.isFinite(distance) || distance < 0) return null;
  return zones
    .filter((zone) => zone.max_distance_km !== null && zone.max_distance_km > 0 && distance <= zone.max_distance_km + 1e-9)
    .sort((a, b) => (a.max_distance_km ?? 0) - (b.max_distance_km ?? 0))[0] ?? null;
}

export function radiusZoneLabel(zoneName: string, distance: number): string {
  return `${zoneName} · ${distance.toFixed(1).replace(".", ",")} km`;
}

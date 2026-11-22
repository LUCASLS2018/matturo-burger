import type { Coordinates } from "./delivery-radius";

/** Driving distance (km) from store to customer via OSRM. Throws when routing is unavailable — never falls back to straight-line. */
export async function roadDistanceKm(from: Coordinates, to: Coordinates): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  let body: { code?: string; routes?: { distance: number }[] } | null = null;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "MatturoBurger/1.0" }, signal: AbortSignal.timeout(8000) });
    if (res.ok) body = await res.json();
  } catch { body = null; }
  const meters = body?.code === "Ok" ? body.routes?.[0]?.distance : undefined;
  if (typeof meters !== "number" || !Number.isFinite(meters)) throw new Error("Não foi possível calcular o percurso por estrada até esta morada. Tente novamente dentro de instantes.");
  return meters / 1000;
}

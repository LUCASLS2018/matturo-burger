// Geocodificação precisa para Portugal: código postal CP7 + número de porta (geoapi.pt, dados INE).
type Ponto = { casa?: string; rua?: string; coordenadas?: [number, number] };
export type Geo = { lat: number; lng: number; street: string | null; exact: boolean };

export function houseNumber(address: string): number | null {
  const m = address.match(/(?:n[º°o.]?\s*|,\s*|\s)(\d{1,4})(?!\d)/i);
  return m ? Number(m[1]) : null;
}

export async function geocodeAddressPt(address: string): Promise<Geo | null> {
  if (address.trim().length < 5) return null;
  try {
    const query = new URLSearchParams({ format: "jsonv2", countrycodes: "pt", limit: "1", q: address.trim() });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, { headers: { Accept: "application/json", "Accept-Language": "pt", "User-Agent": "MatturoBurger/1.0" } });
    if (!response.ok) return null;
    const results = await response.json() as { lat?: string; lon?: string; display_name?: string }[];
    const first = results[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, street: first?.display_name ?? null, exact: true };
  } catch { /* sem rede */ }
  return null;
}

export async function geocodePt(address: string, postal: string): Promise<Geo | null> {
  const cp = postal.replace(/\s/g, "");
  if (!/^\d{4}-?\d{3}$/.test(cp)) return null;
  const code = cp.includes("-") ? cp : `${cp.slice(0, 4)}-${cp.slice(4)}`;
  try {
    const r = await fetch(`https://json.geoapi.pt/cp/${code}`, { headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    const j = (await r.json()) as { pontos?: Ponto[]; centro?: [number, number]; partes?: { "Artéria"?: string }[] };
    const pts = (j.pontos ?? []).filter((p) => p.coordenadas);
    const street = j.partes?.[0]?.["Artéria"] ?? null;
    const n = houseNumber(address);
    if (pts.length) {
      const withNum = pts.map((p) => ({ p, d: n == null ? 0 : Math.abs(Number.parseInt(p.casa ?? "", 10) - n) })).filter((x) => !Number.isNaN(x.d));
      const best = (withNum.sort((a, b) => a.d - b.d)[0]?.p) ?? pts[0]!;
      const [lat, lng] = best.coordenadas!;
      return { lat, lng, street, exact: n != null && Number.parseInt(best.casa ?? "", 10) === n };
    }
    if (j.centro) return { lat: j.centro[0], lng: j.centro[1], street, exact: false };
  } catch { /* sem rede */ }
  return null;
}

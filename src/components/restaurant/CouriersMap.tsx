import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type CourierPoint = { id: string; name: string; label: string; lat: number; lng: number; destLat: number; destLng: number };

const icon = () => L.divIcon({
  className: "delivery-courier-marker",
  html: '<span class="delivery-courier-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14-1-3"/><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"/><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/></svg></span>',
  iconSize: [40, 40], iconAnchor: [20, 20],
});

/** Shows every courier currently on an active delivery, with their destination. */
export default function CouriersMap({ points }: { points: CourierPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const m = L.map(ref.current).setView([38.955, -8.99], 13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19 }).addTo(m);
    map.current = m; layer.current = L.layerGroup().addTo(m);
    return () => { m.remove(); map.current = null; layer.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    const bounds: L.LatLngExpression[] = [];
    for (const p of points) {
      L.marker([p.lat, p.lng], { icon: icon() }).addTo(g).bindTooltip(`${p.name} · ${p.label}`, { permanent: true, direction: "top", offset: [0, -20] });
      L.circleMarker([p.destLat, p.destLng], { radius: 8, className: "delivery-destination" }).addTo(g).bindTooltip(`Destino ${p.label}`);
      L.polyline([[p.lat, p.lng], [p.destLat, p.destLng]], { dashArray: "6 6", weight: 2, className: "delivery-destination" }).addTo(g);
      bounds.push([p.lat, p.lng], [p.destLat, p.destLng]);
    }
    if (bounds.length && !fitted.current) { m.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 16 }); fitted.current = true; }
  }, [points]);

  return <div ref={ref} className="relative z-0 h-[520px] w-full rounded-xl border border-border" aria-label="Mapa dos estafetas" />;
}

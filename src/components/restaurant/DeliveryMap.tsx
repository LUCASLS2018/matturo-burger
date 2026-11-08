import {useEffect,useRef} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const COURIER_ICON = L.divIcon({
  className: "delivery-courier-marker",
  html: '<span class="delivery-courier-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 14-1-3"/><path d="m3 9 6 2a2 2 0 0 1 2-2h2a2 2 0 0 1 1.99 1.81"/><path d="M8 17h3a1 1 0 0 0 1-1 6 6 0 0 1 6-6 1 1 0 0 0 1-1v-.75A5 5 0 0 0 17 5"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/></svg></span>',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

export default function DeliveryMap({lat,lng,position}:{lat:number;lng:number;position:{latitude:number;longitude:number}|null}){
 const ref=useRef<HTMLDivElement>(null);const map=useRef<L.Map|null>(null);const courier=useRef<L.Marker|null>(null);
 useEffect(()=>{if(!ref.current)return;const m=L.map(ref.current).setView([lat,lng],14);map.current=m;L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',maxZoom:19}).addTo(m);L.circleMarker([lat,lng],{radius:9,className:"delivery-destination"}).addTo(m).bindTooltip("Destino");return()=>{m.remove();map.current=null;courier.current=null;};},[lat,lng]);
 useEffect(()=>{const m=map.current;if(!m)return;if(!position){courier.current?.remove();courier.current=null;return;}const point:L.LatLngExpression=[position.latitude,position.longitude];if(courier.current)courier.current.setLatLng(point);else courier.current=L.marker(point,{icon:COURIER_ICON}).addTo(m).bindTooltip("Entregador");m.fitBounds(L.latLngBounds([[lat,lng],point]),{padding:[40,40],maxZoom:16});},[position,lat,lng]);
 return <div ref={ref} className="relative z-0 h-96 w-full border border-border" aria-label="Mapa da entrega"/>;
}

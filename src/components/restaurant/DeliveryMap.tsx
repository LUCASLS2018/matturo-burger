import {useEffect,useRef} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
export default function DeliveryMap({lat,lng,position}:{lat:number;lng:number;position:{latitude:number;longitude:number}|null}){
 const ref=useRef<HTMLDivElement>(null);const map=useRef<L.Map|null>(null);const courier=useRef<L.CircleMarker|null>(null);
 useEffect(()=>{if(!ref.current)return;const m=L.map(ref.current).setView([lat,lng],14);map.current=m;L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',maxZoom:19}).addTo(m);L.circleMarker([lat,lng],{radius:9,className:"delivery-destination"}).addTo(m).bindTooltip("Destino");return()=>{m.remove();map.current=null;courier.current=null;};},[lat,lng]);
 useEffect(()=>{const m=map.current;if(!m)return;if(!position){courier.current?.remove();courier.current=null;return;}const point:L.LatLngExpression=[position.latitude,position.longitude];if(courier.current)courier.current.setLatLng(point);else courier.current=L.circleMarker(point,{radius:10,className:"delivery-courier"}).addTo(m).bindTooltip("Entregador");m.fitBounds(L.latLngBounds([[lat,lng],point]),{padding:[40,40],maxZoom:16});},[position,lat,lng]);
 return <div ref={ref} className="relative z-0 h-96 w-full border border-border" aria-label="Mapa da entrega"/>;
}
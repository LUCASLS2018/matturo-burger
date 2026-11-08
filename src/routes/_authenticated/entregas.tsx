import {createFileRoute} from "@tanstack/react-router";
import {queryOptions,useSuspenseQuery} from "@tanstack/react-query";
import {deliveryDashboard} from "@/lib/delivery.functions";
import {restaurantHead} from "@/lib/restaurant";
import DeliveryPanel from "@/components/restaurant/DeliveryPanel";
export const deliveryQuery=queryOptions({queryKey:["matturo-deliveries"],queryFn:()=>deliveryDashboard(),refetchInterval:15000});
export const Route=createFileRoute("/_authenticated/entregas")({head:()=>restaurantHead("Painel de entregas","Gestão e rastreamento seguro das entregas Matturo."),loader:({context})=>context.queryClient.ensureQueryData(deliveryQuery),component:()=>{const {data}=useSuspenseQuery(deliveryQuery);return <DeliveryPanel data={data}/>;}});
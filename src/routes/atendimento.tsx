import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/restaurant/Information";
import { restaurantHead } from "@/lib/restaurant";
export const Route = createFileRoute("/atendimento")({ head: () => restaurantHead("Atendimento", "Consulte as modalidades de retirada e delivery do Matturo Burger."), component: ServicePage });
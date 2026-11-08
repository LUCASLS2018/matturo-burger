import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/restaurant/Information";
import { restaurantHead } from "@/lib/restaurant";
export const Route = createFileRoute("/contactos")({ head: () => restaurantHead("Contactos e horários", "Endereço, WhatsApp, redes sociais e horários do Matturo Burger em Vila Franca de Xira."), component: ContactPage });
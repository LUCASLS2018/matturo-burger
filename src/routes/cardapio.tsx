import { createFileRoute } from "@tanstack/react-router";
import { MenuPage } from "@/components/restaurant/Menu";
import { restaurantHead } from "@/lib/restaurant";
import { menuQuery } from "@/lib/menu-query";
export const Route = createFileRoute("/cardapio")({head:()=>restaurantHead("Cardápio", "Explore os hambúrgueres, pizzas, entradas, sobremesas e bebidas do Matturo Burger, com fotografias e preços originais."),loader:({context})=>context.queryClient.ensureQueryData(menuQuery),component:MenuPage});
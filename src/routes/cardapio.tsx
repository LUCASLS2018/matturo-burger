import { createFileRoute } from "@tanstack/react-router";
import { MenuPage } from "@/components/restaurant/Menu";
import { restaurantHead } from "@/lib/restaurant";
export const Route = createFileRoute("/cardapio")({head:()=>restaurantHead("Cardápio", "Explore os hambúrgueres, pizzas, entradas, sobremesas e bebidas do Matturo Burger, com fotografias e preços originais."),component:MenuPage});
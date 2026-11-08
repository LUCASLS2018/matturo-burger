import { queryOptions } from "@tanstack/react-query";
import { publicMenu, publicMenuCategories } from "./menu.functions";

export const menuQuery = queryOptions({
  queryKey: ["matturo-public-menu"],
  queryFn: () => publicMenu(),
  staleTime: 15_000,
  refetchInterval: 60_000,
});

export const menuCategoriesQuery = queryOptions({
  queryKey: ["matturo-public-menu-categories"],
  queryFn: () => publicMenuCategories(),
  staleTime: 15_000,
  refetchInterval: 60_000,
});

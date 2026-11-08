import { queryOptions } from "@tanstack/react-query";
import { publicMenu } from "./menu.functions";

export const menuQuery = queryOptions({
  queryKey: ["matturo-public-menu"],
  queryFn: () => publicMenu(),
  staleTime: 15_000,
  refetchInterval: 60_000,
});

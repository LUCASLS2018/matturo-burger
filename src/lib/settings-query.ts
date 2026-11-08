import { queryOptions } from "@tanstack/react-query";
import { publicSettings } from "./settings.functions";
export const publicSettingsQuery = queryOptions({ queryKey: ["matturo-public-settings"], queryFn: () => publicSettings(), refetchInterval: 5000, staleTime: 0 });
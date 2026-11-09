import { Bike, ShoppingBag, Utensils } from "lucide-react";

const icon = (service: string) => (service === "Delivery" ? Bike : service === "Comer no local" ? Utensils : ShoppingBag);

export function ServiceGroupHeading({ service, count }: { service: string; count: number }) {
  const Icon = icon(service);
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary"><Icon className="h-3.5 w-3.5" /></span>
      <h2 className="text-sm font-bold uppercase tracking-wide">{service}</h2>
      <span className="rounded-full bg-secondary px-2 py-0.5 text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

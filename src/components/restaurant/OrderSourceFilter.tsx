import { Globe, LayoutList, PhoneCall, Smartphone } from "lucide-react";
import {
  normalizeOrderSource,
  orderSourceCounts,
  orderSourceLabels,
  type OrderSource,
  type OrderSourceFilter as Filter,
} from "@/lib/order-source";

const sourceIcon: Record<OrderSource, typeof Globe> = { app: Smartphone, web: Globe, telefone: PhoneCall };

/** Small tag showing whether the order came from the app, the website or a phone call. */
export function OrderSourceBadge({ source }: { source?: string | null }) {
  const origin = normalizeOrderSource(source);
  const Icon = sourceIcon[origin];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
      <Icon className="h-2.5 w-2.5" />{orderSourceLabels[origin]}
    </span>
  );
}

/** Filter chips that keep app, web and phone orders apart. */
export function OrderSourceFilter({ value, onChange, orders }: {
  value: Filter;
  onChange: (next: Filter) => void;
  orders: readonly { source?: string | null }[];
}) {
  const counts = orderSourceCounts(orders);
  const options: { key: Filter; label: string; count: number; icon?: typeof Globe }[] = [
    { key: "todos", label: "Todos", count: orders.length, icon: LayoutList },
    { key: "app", label: orderSourceLabels.app, count: counts.app, icon: sourceIcon.app },
    { key: "web", label: orderSourceLabels.web, count: counts.web, icon: sourceIcon.web },
    { key: "telefone", label: orderSourceLabels.telefone, count: counts.telefone, icon: sourceIcon.telefone },
  ];

  return (
    <div role="group" aria-label="Filtrar pedidos por origem" className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-muted-foreground">Origem</span>
      {options.map((option) => {
        const on = value === option.key;
        const Icon = option.icon;
        return (
          <button
            key={option.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
          >
            {Icon && <Icon className="h-3 w-3" />}{option.label}
            <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${on ? "bg-primary-foreground/20" : "bg-secondary"}`}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

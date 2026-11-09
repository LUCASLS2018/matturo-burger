import { lisbonDay } from "./courier-delivery-stats";

/** One completed delivery, with the value of the order it served. */
export type DailyResultRow = {
  courier_id: string | null;
  completed_at: string | null;
  matturo_orders: { total_cents: number } | null;
};

export type DailyCourierResult = {
  id: string;
  name: string;
  deliveries: number;
  valueCents: number;
};

/** Everything the restaurant achieved on one calendar day in Lisbon. */
export type DailyResult = {
  day: string;
  deliveries: number;
  valueCents: number;
  couriers: DailyCourierResult[];
};

/** Groups completed deliveries by Lisbon day, newest day first, split per courier. */
export function summarizeDailyResults(
  rows: readonly DailyResultRow[],
  profiles: readonly { id: string; name: string | null }[],
): DailyResult[] {
  const days = new Map<string, { deliveries: number; valueCents: number; couriers: Map<string, { deliveries: number; valueCents: number }> }>();

  for (const row of rows) {
    if (!row.completed_at) continue;
    const day = lisbonDay(row.completed_at);
    const entry = days.get(day) ?? { deliveries: 0, valueCents: 0, couriers: new Map<string, { deliveries: number; valueCents: number }>() };
    const value = row.matturo_orders?.total_cents ?? 0;
    entry.deliveries += 1;
    entry.valueCents += value;
    const courierId = row.courier_id ?? "sem-estafeta";
    const courier = entry.couriers.get(courierId) ?? { deliveries: 0, valueCents: 0 };
    courier.deliveries += 1;
    courier.valueCents += value;
    entry.couriers.set(courierId, courier);
    days.set(day, entry);
  }

  return Array.from(days, ([day, entry]) => ({
    day,
    deliveries: entry.deliveries,
    valueCents: entry.valueCents,
    couriers: Array.from(entry.couriers, ([id, value]) => ({
      id,
      name: id === "sem-estafeta"
        ? "Sem estafeta"
        : profiles.find((profile) => profile.id === id)?.name?.trim() || "Estafeta sem nome",
      deliveries: value.deliveries,
      valueCents: value.valueCents,
    })).sort((a, b) => b.deliveries - a.deliveries || a.name.localeCompare(b.name, "pt-PT")),
  })).sort((a, b) => b.day.localeCompare(a.day));
}

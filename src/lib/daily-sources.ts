import { normalizeOrderSource, orderSources, type OrderSource } from "./order-source";

export type DailySourceRow = { order_day: string; source: string | null; total_cents: number };
export type DailySources = { day: string; orders: number; valueCents: number; sources: { source: OrderSource; orders: number; valueCents: number }[] };

/** Groups orders by their Lisbon order day and origin (App/Web/Telefone), newest day first. */
export function summarizeDailySources(rows: readonly DailySourceRow[]): DailySources[] {
  const days = new Map<string, DailySources>();
  for (const row of rows) {
    const entry = days.get(row.order_day) ?? { day: row.order_day, orders: 0, valueCents: 0, sources: orderSources.map((source) => ({ source, orders: 0, valueCents: 0 })) };
    const bucket = entry.sources.find((s) => s.source === normalizeOrderSource(row.source))!;
    bucket.orders += 1; bucket.valueCents += row.total_cents;
    entry.orders += 1; entry.valueCents += row.total_cents;
    days.set(row.order_day, entry);
  }
  return [...days.values()].sort((a, b) => b.day.localeCompare(a.day));
}

export type NumberedOrder = { reference: string; daily_number?: number | null; order_day?: string | null };

/** References stay permanent; the daily number is only the customer-facing label. */
export function orderNumber(order: NumberedOrder): string {
  return typeof order.daily_number === "number" && order.daily_number > 0
    ? String(order.daily_number)
    : order.reference;
}

export function lisbonOrderDay(instant: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(instant);
}
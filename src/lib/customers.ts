import { orderNumber } from "./order-number";
export type CustomerOrderRow = {
  daily_number?: number; order_day?: string; reference: string; customer_name: string; customer_phone: string; address: string | null; postal_code: string | null;
  service: string; total_cents: number; status: string; created_at: string;
};

export type Customer = {
  phone: string; name: string; address: string; postal: string; orders: number; spentCents: number;
  lastAt: string; recent: { number: string; reference: string; service: string; totalCents: number; status: string; createdAt: string }[];
};

export const normalizePhone = (phone: string) => phone.replace(/[^\d+]/g, "").replace(/^\+?351(?=\d{9}$)/, "");

/** Groups orders by phone; cancelled orders are listed but not counted in the amount spent. */
export function groupCustomers(rows: CustomerOrderRow[]): Customer[] {
  const map = new Map<string, Customer>();
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const row of sorted) {
    const key = normalizePhone(row.customer_phone);
    let c = map.get(key);
    if (!c) {
      c = { phone: row.customer_phone, name: row.customer_name, address: "", postal: "", orders: 0, spentCents: 0, lastAt: row.created_at, recent: [] };
      map.set(key, c);
    }
    if (!c.address && row.address) { c.address = row.address; c.postal = row.postal_code ?? ""; }
    if (row.status !== "cancelado") { c.orders += 1; c.spentCents += row.total_cents; }
    if (c.recent.length < 5) c.recent.push({ number: orderNumber(row), reference: row.reference, service: row.service, totalCents: row.total_cents, status: row.status, createdAt: row.created_at });
  }
  return [...map.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

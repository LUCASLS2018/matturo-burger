export const RESTAURANT_TIME_ZONE = "Europe/Lisbon";
export const OPENING_HOURS_SUMMARY = "Ter–Dom · 12:00–15:00 e 19:00–21:45 · Segunda encerrado";
export const CLOSED_ORDER_MESSAGE = "O Matturo está FECHADO. Os pedidos só são aceites durante o horário de funcionamento.";

type OpeningInterval = { start: number; end: number };

// JavaScript weekday numbers: Sunday = 0, Monday = 1, … Saturday = 6.
// Minutes are local to Portugal. The opening instant is included and the closing instant excluded.
const weeklyHours: Record<number, readonly OpeningInterval[]> = {
  0: [{ start: 12 * 60, end: 15 * 60 }, { start: 19 * 60, end: 21 * 60 + 45 }],
  1: [],
  2: [{ start: 12 * 60, end: 15 * 60 }, { start: 19 * 60, end: 21 * 60 + 45 }],
  3: [{ start: 12 * 60, end: 15 * 60 }, { start: 19 * 60, end: 21 * 60 + 45 }],
  4: [{ start: 12 * 60, end: 15 * 60 }, { start: 19 * 60, end: 21 * 60 + 45 }],
  5: [{ start: 12 * 60, end: 15 * 60 }, { start: 19 * 60, end: 21 * 60 + 45 }],
  6: [{ start: 12 * 60, end: 15 * 60 }, { start: 19 * 60, end: 21 * 60 + 45 }],
};

const weekdayNumbers: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const lisbonClock = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIME_ZONE,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function isRestaurantOpen(date: Date): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  const parts = lisbonClock.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value;
  const weekday = weekdayNumbers[value("weekday") ?? ""];
  const hour = Number(value("hour"));
  const minute = Number(value("minute"));
  if (weekday === undefined || !Number.isInteger(hour) || !Number.isInteger(minute)) return false;
  const currentMinutes = hour * 60 + minute;
  return (weeklyHours[weekday] ?? []).some((interval) => currentMinutes >= interval.start && currentMinutes < interval.end);
}

export function canAcceptOrders(paused: boolean, date: Date): boolean {
  return !paused && isRestaurantOpen(date);
}

const lisbonDateTime = new Intl.DateTimeFormat("en-CA", {
  timeZone: RESTAURANT_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function lisbonTimestamp(date: Date): number {
  const parts = lisbonDateTime.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
}

/** Converts a datetime-local value explicitly from Portugal time, not the device timezone. */
export function lisbonDateTimeToDate(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  const desired = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  if (!Number.isFinite(desired)) return null;
  let utc = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) utc = desired - (lisbonTimestamp(new Date(utc)) - utc);
  const result = new Date(utc);
  return lisbonTimestamp(result) === desired ? result : null;
}

export function canAcceptScheduledOrder(scheduledFor: string | null, paused: boolean, now: Date): boolean {
  return !scheduledFor || (!paused && isRestaurantOpen(now));
}

export function scheduledOrderError(scheduledFor: string | undefined, now: Date): string | null {
  if (!scheduledFor) return null;
  const scheduled = new Date(scheduledFor);
  if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() <= now.getTime()) return "Escolha uma data e hora futuras para o pedido agendado.";
  if (!isRestaurantOpen(scheduled)) return "A hora agendada tem de estar dentro do horário de funcionamento: terça a domingo, 12:00–15:00 ou 19:00–21:45.";
  return null;
}

export function formatLisbonDateTime(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", { timeZone: RESTAURANT_TIME_ZONE, dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

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

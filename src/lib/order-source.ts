/** Where a Matturo order was placed: the installed app, the website, or a phone call handled by the team. */
export const orderSources = ["app", "web", "telefone"] as const;
export type OrderSource = (typeof orderSources)[number];

export const orderSourceLabels: Record<OrderSource, string> = {
  app: "App",
  web: "Web",
  telefone: "Telefone",
};

export type OrderSourceEnvironment = {
  displayModeStandalone: boolean;
  iosStandalone: boolean;
};

/** Reads the browser signals that tell an installed app from a normal browser tab. Safe on the server. */
export function readOrderSourceEnvironment(): OrderSourceEnvironment {
  if (typeof window === "undefined") return { displayModeStandalone: false, iosStandalone: false };
  let displayModeStandalone = false;
  try {
    displayModeStandalone = window.matchMedia("(display-mode: standalone)").matches;
  } catch {
    displayModeStandalone = false;
  }
  return {
    displayModeStandalone,
    iosStandalone: (window.navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
}

/** An installed app runs standalone; anything else is the website in a browser tab. */
export function orderSourceFromEnvironment(environment: OrderSourceEnvironment): OrderSource {
  return environment.displayModeStandalone || environment.iosStandalone ? "app" : "web";
}

export function detectOrderSource(): OrderSource {
  return orderSourceFromEnvironment(readOrderSourceEnvironment());
}

/** Unknown or missing origins are treated as a website order. */
export function normalizeOrderSource(value: unknown): OrderSource {
  return orderSources.includes(value as OrderSource) ? (value as OrderSource) : "web";
}

export type OrderSourceFilter = OrderSource | "todos";

export function filterByOrderSource<T extends { source?: string | null }>(orders: readonly T[], filter: OrderSourceFilter): T[] {
  if (filter === "todos") return [...orders];
  return orders.filter((order) => normalizeOrderSource(order.source) === filter);
}

export function orderSourceCounts<T extends { source?: string | null }>(orders: readonly T[]): Record<OrderSource, number> {
  const counts: Record<OrderSource, number> = { app: 0, web: 0, telefone: 0 };
  for (const order of orders) counts[normalizeOrderSource(order.source)] += 1;
  return counts;
}

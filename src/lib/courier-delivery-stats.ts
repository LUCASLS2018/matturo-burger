const activeStates = new Set(["confirmed", "to_restaurant", "collected", "active"]);

type DeliveryCountRow = {
  courier_id: string | null;
  status: string;
  completed_at?: string | null;
};

/** Calendar day in Lisbon (YYYY-MM-DD), so counts reset at the restaurant's midnight. */
export function lisbonDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Lisbon", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
}

type CourierProfile = {
  id: string;
  name: string | null;
};

/** Separates each courier's current workload from deliveries actually completed. */
export function summarizeCourierDeliveries(
  courierIds: string[],
  profiles: CourierProfile[],
  deliveries: DeliveryCountRow[],
  now: Date = new Date(),
) {
  const today = lisbonDay(now);
  const ids = new Set(courierIds);
  for (const delivery of deliveries) {
    if (delivery.courier_id) ids.add(delivery.courier_id);
  }

  return Array.from(ids, (id) => {
    const own = deliveries.filter((delivery) => delivery.courier_id === id);
    return {
      id,
      name: profiles.find((profile) => profile.id === id)?.name?.trim() || "Estafeta sem nome",
      active: own.filter((delivery) => activeStates.has(delivery.status)).length,
      delivered: own.filter((delivery) => delivery.status === "delivered" && Boolean(delivery.completed_at) && lisbonDay(delivery.completed_at!) === today).length,
    };
  }).sort((a, b) => b.delivered - a.delivered || a.name.localeCompare(b.name, "pt-PT"));
}

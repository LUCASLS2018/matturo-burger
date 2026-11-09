const activeStates = new Set(["confirmed", "to_restaurant", "collected", "active"]);

type DeliveryCountRow = {
  courier_id: string | null;
  status: string;
};

type CourierProfile = {
  id: string;
  name: string | null;
};

/** Separates each courier's current workload from deliveries actually completed. */
export function summarizeCourierDeliveries(
  courierIds: string[],
  profiles: CourierProfile[],
  deliveries: DeliveryCountRow[],
) {
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
      delivered: own.filter((delivery) => delivery.status === "delivered").length,
    };
  }).sort((a, b) => b.delivered - a.delivered || a.name.localeCompare(b.name, "pt-PT"));
}

export const paymentMethods = ["Multibanco", "Dinheiro"] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

/** Reads the payment method from the order notes ("Pagamento: ..." line). */
export function paymentFromNotes(notes: string | null | undefined): PaymentMethod | null {
  const match = (notes ?? "").match(/^Pagamento: (Multibanco|Dinheiro)/m);
  return (match?.[1] as PaymentMethod) ?? null;
}

/** Replaces the payment line, noting it was changed on delivery; other notes stay untouched. */
export function replacePaymentNote(notes: string | null | undefined, method: PaymentMethod, changedBy = "estafeta") {
  const rest = (notes ?? "").split("\n").filter((line) => !line.startsWith("Pagamento:"));
  return [`Pagamento: ${method} (alterado pelo ${changedBy} na entrega)`, ...rest].join("\n").slice(0, 500);
}

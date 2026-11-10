import { describe, expect, it } from "vitest";
import { kitchenNotes, ticketHtml } from "@/lib/print-ticket";

const order = {
  reference: "MT-2026-0001", daily_number: 7, order_day: "2026-11-10",
  customer_name: "Lucas Silva", customer_phone: "912345678", service: "Delivery",
  address: "Rua das Flores 12", postal_code: "4000-123",
  notes: "Pagamento: Dinheiro — paga com 20,00 € (troco 5,00 €)\nSem cebola",
  created_at: "2026-11-10T12:00:00Z", scheduled_for: null,
  delivery_fee_cents: 200, total_cents: 1500,
  matturo_order_items: [{ name: "Hamburguinho", options: { Tamanho: "Grande" }, qty: 2, line_total_cents: 1300 }],
};

describe("kitchen ticket", () => {
  const html = ticketHtml(order, "cozinha");

  it("shows the order number, items and options", () => {
    expect(html).toContain("COZINHA");
    expect(html).toContain("#7");
    expect(html).toContain("Hamburguinho");
    expect(html).toContain("Tamanho: Grande");
  });

  it("keeps the customer's own note but drops the payment line", () => {
    expect(html).toContain("Sem cebola");
    expect(html).not.toContain("Pagamento:");
    expect(kitchenNotes(order.notes)).toBe("Sem cebola");
  });

  it("shows no prices and no customer data", () => {
    expect(html).not.toContain("€");
    expect(html).not.toContain("TOTAL");
    expect(html).not.toContain("912345678");
    expect(html).not.toContain("Rua das Flores");
  });
});

describe("customer ticket", () => {
  const html = ticketHtml(order, "cliente");

  it("shows customer data, prices and total", () => {
    expect(html).toContain("Lucas Silva");
    expect(html).toContain("912345678");
    expect(html).toContain("Rua das Flores 12");
    expect(html).toContain("6,50 €");
    expect(html).toContain("Entrega");
    expect(html).toContain("2,00 €");
    expect(html).toContain("TOTAL");
    expect(html).toContain("15,00 €");
    expect(html).toContain("Pagamento: Dinheiro");
  });
});

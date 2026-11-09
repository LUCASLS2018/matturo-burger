import { describe, expect, it } from "vitest";
import { orderPushMessage } from "./push.server";

const order = (status: string, service = "Delivery") => ({
  status,
  service,
  reference: "MT-2026-0001",
  daily_number: 7,
  order_day: "2026-11-09",
});

describe("orderPushMessage", () => {
  it("announces each restaurant state in the customer's words", () => {
    expect(orderPushMessage(order("novo"))).toEqual({
      title: "Pedido recebido",
      body: "Recebemos o seu pedido #7. Vamos confirmá-lo.",
    });
    expect(orderPushMessage(order("aceite"))).toEqual({
      title: "Pedido aceite",
      body: "O restaurante aceitou o seu pedido #7.",
    });
    expect(orderPushMessage(order("em_preparacao"))).toEqual({
      title: "A preparar",
      body: "O seu pedido #7 está a ser preparado.",
    });
    expect(orderPushMessage(order("concluido"))).toEqual({
      title: "Pedido concluído",
      body: "O seu pedido #7 está concluído. Obrigado pela preferência!",
    });
    expect(orderPushMessage(order("cancelado"))).toEqual({
      title: "Pedido cancelado",
      body: "O seu pedido #7 foi cancelado. Fale connosco se tiver dúvidas.",
    });
  });

  it("says ready to collect for pickup and ready for delivery for delivery", () => {
    expect(orderPushMessage(order("pronto", "Delivery"))).toEqual({
      title: "Pedido pronto",
      body: "O seu pedido #7 está pronto. Vamos tratar da entrega.",
    });
    expect(orderPushMessage(order("pronto", "Retirada"))).toEqual({
      title: "Pronto a levantar",
      body: "O seu pedido #7 está pronto.",
    });
  });

  it("prefers the courier's own state over the restaurant state", () => {
    expect(orderPushMessage(order("pronto"), { status: "active", courier: "Tiago" })).toEqual({
      title: "O estafeta está a caminho",
      body: "Tiago está a caminho com o seu pedido #7.",
    });
    expect(orderPushMessage(order("pronto"), { status: "delivered", courier: null })).toEqual({
      title: "Pedido entregue",
      body: "O seu pedido #7 foi entregue. Bom apetite!",
    });
  });

  it("says nothing for a state with no news", () => {
    expect(orderPushMessage(order("estranho"))).toBeNull();
  });
});

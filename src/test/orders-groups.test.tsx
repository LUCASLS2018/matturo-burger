import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const order = (reference: string, service: string, minutesAgo: number) => ({
    id: `id-${reference}`,
    reference,
    service,
    status: "novo",
    created_at: new Date(Date.now() - minutesAgo * 60000).toISOString(),
    customer_name: `Cliente ${reference}`,
    customer_phone: "912345678",
    address: "Rua do cliente 10",
    postal_code: "2600-162",
    zone_name: "vila franca de xira",
    total_cents: 1200,
    delivery_fee_cents: service === "Delivery" ? 300 : 0,
    notes: null,
    scheduled_for: null as string | null,
    matturo_order_items: [{ name: "Hambúrguer", qty: 1, line_total_cents: 1200, options: {} }],
  });
  return {
    move: vi.fn().mockResolvedValue(undefined),
    assign: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
    orders: [
      order("D2", "Delivery", 20),
      order("R2", "Retirada", 10),
      order("D1", "Delivery", 60),
      order("R1", "Retirada", 40),
    ],
    board: { couriers: [{ id: "c1", name: "Ana" }], deliveries: [] },
    settings: { isOpen: true, paused: false },
  };
});

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: ({ children }: { children?: unknown }) => children,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => (mocks.move) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: () => ({ on: () => ({ subscribe: () => undefined }) }),
    removeChannel: vi.fn(),
  },
}));
vi.mock("@/lib/orders.functions", () => ({
  adminOrders: {},
  setOrderStatus: {},
  orderCourierBoard: {},
  assignOrderCourier: {},
  deleteClosedOrder: {},
}));
vi.mock("@/lib/delivery.functions", () => ({ deliveryDashboard: {}, liveCouriersFeed: {} }));
vi.mock("@/components/restaurant/LiveCouriers", () => ({ LiveCouriers: () => null, default: () => null }));
vi.mock("@/components/restaurant/ManualOrder", () => ({
  ManualOrder: () => null,
  manualMenuQuery: { queryKey: ["manual-menu"] },
}));
vi.mock("@/lib/settings-query", () => ({ publicSettingsQuery: { queryKey: ["settings"] } }));
vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate, fetchQuery: vi.fn() }),
  useSuspenseQuery: (query: { queryKey: string[] }) => ({
    data: query.queryKey[0] === "matturo-order-couriers" ? mocks.board : query.queryKey[0] === "settings" ? mocks.settings : mocks.orders,
  }),
}));

import { Route } from "@/routes/_authenticated/pedidos";

const OrdersPage = (Route as unknown as { component: () => ReactElement }).component;

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("orders board", () => {
  it("shows delivery and retirada as separate groups, oldest order first inside each", () => {
    render(<OrdersPage />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent).slice(0, 2)).toEqual(["Delivery", "Retirada"]);
    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => card.querySelector("b")?.textContent)).toEqual(["#D1", "#D2", "#R1", "#R2"]);
  });

  it("keeps scheduled orders in their own tab and disables acceptance while closed", () => {
    mocks.orders.push({ ...mocks.orders[0]!, id: "scheduled", reference: "A1", customer_name: "Cliente A1", scheduled_for: new Date(Date.now() + 2 * 86400000).toISOString() });
    mocks.settings.isOpen = false;
    try {
      render(<OrdersPage />);
      const section = screen.getByRole("region", { name: "Pedidos agendados" });
      const card = within(section).getByText("Cliente A1").closest("article") as HTMLElement;
      fireEvent.click(card.querySelector("button") as HTMLButtonElement);
      expect((within(card).getByRole("button", { name: "Aceite" }) as HTMLButtonElement).disabled).toBe(true);
    } finally {
      mocks.orders.pop();
      mocks.settings.isOpen = true;
    }
  });
});

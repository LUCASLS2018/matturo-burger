import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  submit: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/orders.functions", () => ({ placeOrder: mocks.submit, claimOrder: vi.fn() }));
vi.mock("@/lib/reverse-geocode.functions", () => ({ reverseGeocode: vi.fn() }));
vi.mock("@/lib/settings.functions", () => ({ quoteRadiusDelivery: mocks.quote, publicSettings: vi.fn() }));
vi.mock("@/lib/settings-query", () => ({ publicSettingsQuery: {} }));
vi.mock("@tanstack/react-query", () => ({ useSuspenseQuery: () => ({ data: {
  isOpen: true, paused: false, deliveryMode: "radius", zones: [],
} }) }));
vi.mock("@/lib/cart", () => ({ useCart: () => ({
  service: "Delivery", setService: vi.fn(), clear: vi.fn(), subtotal: 8,
  items: [{ key: "item", productId: "burger", name: "Hambúrguer", qty: 1, price: 8, options: {} }],
}) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { Route } from "@/routes/finalizar";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("checkout outside delivery radius", () => {
  it.each([false, true])("blocks delivery for an out-of-radius address (scheduled: %s)", async (scheduled) => {
    mocks.quote.mockResolvedValue({ zone: null, distanceKm: 12 });
    const Checkout = Route.options.component;
    if (!Checkout) throw new Error("Checkout component missing");
    render(<Checkout />);
    fireEvent.change(screen.getByLabelText("Morada de entrega"), { target: { value: "Rua distante 10" } });
    fireEvent.change(screen.getByLabelText(/Código postal/), { target: { value: "1000-001" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar distância e portes" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Fora do raio de entrega" })).toBeDisabled());
    if (scheduled) fireEvent.click(screen.getByRole("button", { name: "Agendar pedido" }));
    expect(screen.getByRole("button", { name: "Fora do raio de entrega" })).toBeDisabled();
    expect(mocks.quote).toHaveBeenCalledWith({ data: { address: "Rua distante 10", postal: "1000-001" } });
    expect(mocks.submit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Morada de entrega"), { target: { value: "Outra morada 20" } });
    expect(screen.queryByRole("button", { name: "Fora do raio de entrega" })).not.toBeInTheDocument();
  });
});
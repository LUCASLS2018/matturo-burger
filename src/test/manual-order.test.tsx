import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), invalidate: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => mocks.save }));
vi.mock("@/lib/orders.functions", () => ({ createManualOrder: {} }));
vi.mock("@/lib/menu.functions", () => ({ adminMenu: {} }));
vi.mock("@/lib/settings-query", () => ({ publicSettingsQuery: { queryKey: ["settings"] } }));
vi.mock("@/lib/menu-query", () => ({ menuCategoriesQuery: { queryKey: ["categories"] } }));
vi.mock("@tanstack/react-query", () => ({
  queryOptions: (options: unknown) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
  useSuspenseQuery: (query: { queryKey: string[] }) => ({ data: query.queryKey[0] === "settings"
    ? { paused: false, zones: [{ name: "vila franca de xira", postal_prefixes: ["2600"], fee_cents: 300 }] }
    : query.queryKey[0] === "categories" ? [{ slug: "hamburguer", name: "HAMBURGUER" }]
    : [{ id: "burger", slug: "hamburguer", category: "hamburguer", name: "Hambúrguer", price: 8, available: true, visible: true, groups: [{ id: "extras", name: "Extras", required: true, min: 1, max: 1, modifiers: [{ id: "none", name: "NAO QUERO", price: 0, max: 1 }] }] }] }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
import { ManualOrder } from "@/components/restaurant/ManualOrder";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("manual phone order form", () => {
  it("creates repeated products as separate lines with chosen options and configured delivery fee", async () => {
    mocks.save.mockResolvedValue({ kind: "created", reference: "M123", token: "token" });
    const close = vi.fn();
    render(<ManualOrder onClose={close} />);
    fireEvent.change(screen.getByLabelText("Nome do cliente"), { target: { value: "Cliente" } });
    fireEvent.change(screen.getByLabelText("Telemóvel"), { target: { value: "912345678" } });
    fireEvent.click(screen.getByRole("button", { name: /^Delivery$/ }));
    fireEvent.change(screen.getByLabelText("Morada"), { target: { value: "Rua do cliente 10" } });
    fireEvent.change(screen.getByLabelText("Código postal"), { target: { value: "2600-162" } });
    fireEvent.click(screen.getByRole("button", { name: "Selecionar Hambúrguer" }));
    expect(screen.getByRole("button", { name: /Adicionar ·/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /NAO QUERO/ }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar ·/ }));
    fireEvent.click(screen.getByRole("button", { name: /Adicionar ·/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Criar pedido$/ }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    const data = mocks.save.mock.calls[0]?.[0].data;
    expect(data.expectedTotalCents).toBe(1900);
    expect(data.items).toEqual([
      { productId: "burger", qty: 1, selected: { none: 1 }, options: {} },
      { productId: "burger", qty: 1, selected: { none: 1 }, options: {} },
    ]);
    expect(data.service).toBe("Delivery");
    expect(data.postal).toBe("2600-162");
  });
});
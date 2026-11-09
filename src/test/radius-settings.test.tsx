import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ saveZone: vi.fn(), saveStore: vi.fn() }));
vi.mock("@/lib/settings.functions", () => ({ saveDeliveryZone: mocks.saveZone, saveStoreDelivery: mocks.saveStore }));

import { RadiusDeliverySettings } from "@/components/restaurant/RadiusDeliverySettings";

const settings = {
  id: true,
  orders_paused: false,
  revision: 1,
  created_at: "2026-11-09T00:00:00Z",
  updated_at: "2026-11-09T00:00:00Z",
  delivery_mode: "postal",
  store_address: "R. Alm. Cândido dos Reis, Vila Franca de Xira, Portugal",
  store_latitude: null,
  store_longitude: null,
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("radius delivery administration", () => {
  it("saves an owner-entered radius and fee without activating it automatically", async () => {
    const run = vi.fn(async (action: () => Promise<unknown>) => { await action(); });
    render(<RadiusDeliverySettings settings={settings} zones={[]} busy={false} run={run} />);
    fireEvent.click(screen.getByRole("button", { name: "Por raio" }));
    fireEvent.change(screen.getByLabelText("Nome da faixa"), { target: { value: "Perto da loja" } });
    fireEvent.change(screen.getByLabelText("Raio máximo (km)"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Entrega (€)"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar faixa" }));
    await waitFor(() => expect(mocks.saveZone).toHaveBeenCalledOnce());
    expect(mocks.saveZone.mock.calls[0]?.[0]).toEqual({ data: {
      id: undefined,
      revision: undefined,
      name: "Perto da loja",
      postal_prefixes: [],
      max_distance_km: 3,
      fee_cents: 300,
      active: false,
    } });
  });

  it("saves radius mode together with the confirmed store address", async () => {
    const run = vi.fn(async (action: () => Promise<unknown>) => { await action(); });
    render(<RadiusDeliverySettings settings={settings} zones={[]} busy={false} run={run} />);
    fireEvent.click(screen.getByRole("button", { name: "Por raio" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar morada e modalidade" }));
    await waitFor(() => expect(mocks.saveStore).toHaveBeenCalledWith({ data: {
      storeAddress: settings.store_address,
      deliveryMode: "radius",
      revision: 1,
    } }));
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: vi.fn(() => builder),
      inputValidator: vi.fn(() => builder),
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ setResponseHeader: vi.fn(), getRequestIP: () => null }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { createManualOrder } from "./orders.functions";

const invoke = createManualOrder as unknown as (input: { data: { items: { reward?: boolean }[] }; context: { supabase: { rpc: ReturnType<typeof vi.fn> } } }) => Promise<unknown>;

describe("manual order permissions", () => {
  it("rejects a signed-in non-administrator before creating an order", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    await expect(invoke({ data: { items: [] }, context: { supabase: { rpc } } })).rejects.toThrow("Acesso reservado ao administrador.");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("matturo_has_role", { wanted: "admin" });
  });
  it("does not let manual entry spend customer loyalty points", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(invoke({ data: { items: [{ reward: true }] }, context: { supabase: { rpc } } })).rejects.toThrow("As ofertas devem ser resgatadas pela conta do cliente.");
  });
});
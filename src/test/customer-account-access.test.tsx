import { QueryClient } from "@tanstack/react-query";
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

const getUser = vi.fn();
const onAuthStateChange = vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: () => getUser(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => onAuthStateChange(callback),
    },
  },
}));

function renderStore() {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/conta"] }),
    context: { queryClient: new QueryClient() },
  });
  return render(<RouterProvider router={router} />);
}

describe("Public store header", () => {
  it("offers only the customer account when nobody is signed in", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    renderStore();

    const account = await screen.findByRole("link", { name: "Criar conta de cliente" });
    expect(account).toHaveAttribute("href", "/conta");
    expect(screen.queryByRole("link", { name: /painel/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /administração/i })).toBeNull();
  });

  it("sends a signed-in customer to their own orders, not to the team panel", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "customer-1" } } });
    renderStore();

    const account = await screen.findByRole("link", { name: "A minha conta" });
    expect(account).toHaveAttribute("href", "/minha-conta");
    await waitFor(() => expect(screen.queryByRole("link", { name: /painel/i })).toBeNull());
  });
});

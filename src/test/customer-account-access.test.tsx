import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children }: { to: string; children: unknown }) => <a href={to}>{children as never}</a> }));
import { CustomerAccountAccess } from "@/components/restaurant/CustomerAccountAccess";

describe("Public store header", () => {
  it("sends customers to their phone account, never the team panel", () => {
    render(<CustomerAccountAccess />);
    expect(screen.getByRole("link", { name: "A minha conta" })).toHaveAttribute("href", "/pontos");
  });
});

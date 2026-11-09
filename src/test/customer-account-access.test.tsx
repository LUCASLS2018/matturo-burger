import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ Link: ({ to, ...rest }: { to: string }) => <a href={to} {...rest} /> }));
import { CustomerAccountAccess } from "@/components/restaurant/CustomerAccountAccess";

describe("Public store header", () => {
  it("sends customers to their phone account, never the team panel", () => {
    render(<CustomerAccountAccess />);
    expect(screen.getByRole("link", { name: "A minha conta" })).toHaveAttribute("href", "/pontos");
  });
});

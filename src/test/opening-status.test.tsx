import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ settings: { isOpen: true, paused: false } }));
vi.mock("@tanstack/react-query", () => ({ useSuspenseQuery: () => ({ data: state.settings }) }));
vi.mock("@/lib/settings-query", () => ({ publicSettingsQuery: {} }));

import { OpeningStatus } from "@/components/restaurant/OpeningStatus";

afterEach(() => { cleanup(); state.settings = { isOpen: true, paused: false }; });

describe("public opening status", () => {
  it("shows FECHADO when the team closes for an emergency during opening hours", () => {
    state.settings = { isOpen: true, paused: true };
    render(<OpeningStatus />);
    expect(screen.getByRole("status")).toHaveTextContent("FECHADO");
    expect(screen.getByRole("status")).toHaveTextContent("Fechado temporariamente pela equipa");
  });

  it("shows ABERTO only when within hours and not manually closed", () => {
    render(<OpeningStatus />);
    expect(screen.getByRole("status")).toHaveTextContent("ABERTO");
  });
});

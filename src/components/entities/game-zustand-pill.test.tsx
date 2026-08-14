import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameZustandPill } from "@/components/entities/game-zustand-pill";

afterEach(() => {
  cleanup();
});

describe("GameZustandPill", () => {
  it.each([
    ["frei", "Frei"],
    ["ausgeliehen", "Ausgeliehen"],
    ["wartung", "Wartung"],
  ] as const)("renders the %s pill as %s", (zustand, label) => {
    render(<GameZustandPill zustand={zustand} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders nothing for nicht-erfasst (#121)", () => {
    const { container } = render(<GameZustandPill zustand="nicht-erfasst" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows an X/Y ratio when several copies exist (#125)", () => {
    render(<GameZustandPill zustand="ausgeliehen" count={1} total={2} />);

    expect(screen.getByText("1/2 Ausgeliehen")).toBeInTheDocument();
  });

  it("stays plain when total is 1, even if count/total are given", () => {
    render(<GameZustandPill zustand="ausgeliehen" count={1} total={1} />);

    expect(screen.getByText("Ausgeliehen")).toBeInTheDocument();
  });

  it("stays plain when no total is given at all", () => {
    render(<GameZustandPill zustand="frei" />);

    expect(screen.getByText("Frei")).toBeInTheDocument();
  });
});

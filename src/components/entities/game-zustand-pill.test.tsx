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
});

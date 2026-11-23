import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StatTile } from "./stat-tile";

afterEach(() => {
  cleanup();
});

describe("StatTile", () => {
  it("renders as plain text without an href", () => {
    render(<StatTile label="Aktive Mitglieder" value={12} />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders as a link to the given href", () => {
    render(
      <StatTile
        label="Offene Ausleihen"
        value={3}
        href="/ludothek?ausgeliehen=1"
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/ludothek?ausgeliehen=1",
    );
  });

  // #429: die Karte muss sich auf die volle Grid-Zeilenhöhe strecken, sonst
  // sind Karten mit 1- vs. 2-zeiligem Titel unterschiedlich hoch.
  it("stretches to the full grid row height when linked", () => {
    render(<StatTile label="Offene Ausleihen" value={3} href="/ludothek" />);

    expect(screen.getByRole("link")).toHaveClass("h-full");
  });
});

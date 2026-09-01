import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PrivateSpieleSection } from "@/components/feature/mitglied-profil/private-spiele-section";

afterEach(() => {
  cleanup();
});

describe("PrivateSpieleSection (#384, Live-Review F13)", () => {
  it("makes the whole card a single link to the Ludothek filter", () => {
    render(<PrivateSpieleSection meepleId="meeple-1" />);

    const link = screen.getByRole("link", { name: /In der Ludothek ansehen/ });
    expect(link).toHaveAttribute(
      "href",
      "/ludothek?privatbesitz=1&bei=meeple-1",
    );
    // Card-Inhalt (Überschrift/Text) liegt innerhalb desselben Links.
    expect(link).toContainElement(
      screen.getByText("Private Spiele"),
    );
  });

  it("shows a link icon next to the label", () => {
    render(<PrivateSpieleSection meepleId="meeple-1" />);

    const link = screen.getByRole("link", { name: /In der Ludothek ansehen/ });
    expect(link.querySelector("svg")).toBeInTheDocument();
  });
});

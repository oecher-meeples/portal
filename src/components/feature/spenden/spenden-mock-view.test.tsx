import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SpendenMockView } from "@/components/feature/spenden/spenden-mock-view";

afterEach(cleanup);

describe("SpendenMockView (#267)", () => {
  it("links the PayPal button to the paypal.me donation page in a new tab", () => {
    render(<SpendenMockView />);

    const link = screen.getByRole("button", { name: "Mit PayPal spenden" });
    expect(link).toHaveAttribute("href", "https://paypal.me/oechermeeples");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows a 'Spiele spenden' card with a mailto link to the club address", () => {
    render(<SpendenMockView />);

    expect(screen.getByText("Spiele spenden")).toBeInTheDocument();
    const link = screen.getByRole("button", {
      name: "spenden@oecher-meeples.org",
    });
    expect(link).toHaveAttribute("href", "mailto:spenden@oecher-meeples.org");
  });

  // #421: echte, altersbasierte Beitragsarten statt veralteter Mock-Werte,
  // keine falsche "Aufnahme auf Einladung"-Zeile mehr.
  it("shows the real, age-based contribution categories instead of the old mock values", () => {
    render(<SpendenMockView />);

    expect(screen.getByText("0 € / Jahr")).toBeInTheDocument();
    expect(screen.getByText("12 € / Jahr")).toBeInTheDocument();
    expect(screen.getByText("36 € / Jahr")).toBeInTheDocument();
    expect(screen.queryByText("Aufnahme")).not.toBeInTheDocument();
    expect(
      screen.queryByText("auf Einladung eines Mitglieds"),
    ).not.toBeInTheDocument();
  });
});

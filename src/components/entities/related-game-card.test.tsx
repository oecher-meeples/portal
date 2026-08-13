import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { RelatedGameCard } from "@/components/entities/related-game-card";

afterEach(() => {
  cleanup();
});

const GAME = {
  id: "game-2",
  title: "Wingspan: Oceania",
  slug: "wingspan-oceania",
  imageUrl: null,
};

describe("RelatedGameCard", () => {
  it("links to the title's detail page", () => {
    render(<RelatedGameCard game={GAME} />);

    expect(
      screen.getByRole("link", { name: /Wingspan: Oceania/ }),
    ).toHaveAttribute("href", "/ludothek/wingspan-oceania");
  });

  it("shows the location chain when set (internal viewers)", () => {
    render(<RelatedGameCard game={GAME} locationChain="Regal A" />);

    expect(screen.getByText("Regal A")).toBeInTheDocument();
  });

  it("omits the location line entirely when not passed (guests)", () => {
    render(<RelatedGameCard game={GAME} />);

    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Regal A")).not.toBeInTheDocument();
  });
});

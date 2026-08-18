import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { BggRatingBadge } from "./bgg-rating-badge";

afterEach(() => {
  cleanup();
});

describe("BggRatingBadge", () => {
  it("renders nothing without a rating", () => {
    const { container } = render(<BggRatingBadge averageRating={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the rating rounds outside 1–10 (e.g. 0 ratings)", () => {
    const { container } = render(<BggRatingBadge averageRating={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the hexagon with the resolved color for a real rating", () => {
    render(<BggRatingBadge averageRating={8.4} />);

    const hexagon = screen.getByRole("img", {
      name: "Durchschnittliche BGG Bewertung: 8.4",
    });
    expect(hexagon).toHaveStyle({ backgroundColor: "#66BB6A" });
  });
});

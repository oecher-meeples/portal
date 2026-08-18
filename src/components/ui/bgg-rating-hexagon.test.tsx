import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BggRatingHexagon } from "./bgg-rating-hexagon";

afterEach(() => {
  cleanup();
});

describe("BggRatingHexagon", () => {
  it("shows the rating with one decimal and the given background color", () => {
    render(
      <BggRatingHexagon rating={8.4} hexColor="#66BB6A" meaning="Sehr gut." />,
    );

    const hexagon = screen.getByRole("img", {
      name: "Durchschnittliche BGG Bewertung: 8.4",
    });
    expect(hexagon).toHaveTextContent("8.4");
    expect(hexagon).toHaveStyle({ backgroundColor: "#66BB6A" });
  });

  it("shows the two-line tooltip on hover", async () => {
    const user = userEvent.setup();
    render(
      <BggRatingHexagon
        rating={9.1}
        hexColor="#43A047"
        meaning="Exzellentes Spiel. Möchte es immer spielen."
      />,
    );

    await user.hover(
      screen.getByRole("img", {
        name: "Durchschnittliche BGG Bewertung: 9.1",
      }),
    );

    expect(
      await screen.findByText("Durchschnittliche BGG Bewertung"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Exzellentes Spiel. Möchte es immer spielen."),
    ).toBeInTheDocument();
  });
});

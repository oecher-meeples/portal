import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameCoverMedia } from "@/components/entities/game-cover-media";

afterEach(cleanup);

describe("GameCoverMedia (#467)", () => {
  it("renders a single fixed aspect-ratio image by default", () => {
    render(
      <GameCoverMedia
        imageUrl="https://example.com/cover.jpg"
        title="Ark Nova"
      />,
    );

    const images = screen.getAllByAltText("Ark Nova");
    expect(images).toHaveLength(1);
  });

  it("renders two responsive variants when heroResponsive is set", () => {
    render(
      <GameCoverMedia
        imageUrl="https://example.com/cover.jpg"
        title="Ark Nova"
        heroResponsive
      />,
    );

    const images = screen.getAllByAltText("Ark Nova");
    expect(images).toHaveLength(2);
    // Below lg: image determines its own size, capped at 40vh, hidden at lg+.
    expect(images[0]).toHaveClass("max-h-[40vh]", "lg:hidden");
    // At lg+: fixed aspect-ratio box, hidden below lg.
    expect(images[1].parentElement).toHaveClass("hidden", "lg:block");
  });

  it("still shows the plain placeholder without an image, heroResponsive or not", () => {
    render(<GameCoverMedia imageUrl={null} title="Ark Nova" heroResponsive />);

    expect(screen.getByText("COVER")).toBeInTheDocument();
    expect(screen.queryAllByAltText("Ark Nova")).toHaveLength(0);
  });
});

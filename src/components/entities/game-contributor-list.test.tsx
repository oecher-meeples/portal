import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  GameContributorList,
  GameIllustratorsCard,
} from "@/components/entities/game-contributor-list";
import type { GameContributorDisplay } from "@/lib/ludothek/taxonomy/game-contributors-display";

afterEach(cleanup);

const illustrators = (count: number): GameContributorDisplay[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Illustrator ${i + 1}`,
    roles: ["ILLUSTRATOR"],
  }));

describe("GameContributorList", () => {
  it("renders the given contributors as pills", () => {
    render(
      <GameContributorList
        contributors={[{ name: "Kosmos", roles: ["PUBLISHER"] }]}
      />,
    );

    expect(screen.getByText("Kosmos")).toBeInTheDocument();
  });

  it("renders nothing without contributors", () => {
    const { container } = render(<GameContributorList contributors={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("GameIllustratorsCard", () => {
  it("renders a collapsible card headed with the illustrator count", () => {
    render(<GameIllustratorsCard illustrators={illustrators(6)} />);

    expect(
      screen.getByRole("button", { name: /Illustratoren \(6\)/ }),
    ).toBeInTheDocument();
  });

  it("renders nothing without illustrators", () => {
    const { container } = render(<GameIllustratorsCard illustrators={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

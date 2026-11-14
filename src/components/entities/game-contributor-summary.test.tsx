import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { GameContributorSummary } from "@/components/entities/game-contributor-summary";

afterEach(cleanup);

describe("GameContributorSummary", () => {
  it("shows the publisher and up to two illustrators", () => {
    render(
      <GameContributorSummary
        publisher={["Kosmos"]}
        illustrator={["A", "B"]}
      />,
    );

    expect(screen.getByText("Kosmos")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("shows no illustrators at all once there are more than two", () => {
    render(
      <GameContributorSummary
        publisher={["Kosmos"]}
        illustrator={["A", "B", "C"]}
      />,
    );

    expect(screen.getByText("Kosmos")).toBeInTheDocument();
    expect(screen.queryByText("A")).not.toBeInTheDocument();
  });
});

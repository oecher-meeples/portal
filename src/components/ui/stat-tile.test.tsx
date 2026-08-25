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
});

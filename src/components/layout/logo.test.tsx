import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { Logo } from "@/components/layout/logo";

afterEach(cleanup);

describe("Logo (#293)", () => {
  it("links to the homepage instead of toggling an internal state", () => {
    render(<Logo />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows only the image logo, never the Meeple-figure variant", () => {
    render(<Logo />);

    expect(
      screen.queryByText("Oecher Meeples", { selector: "span" }),
    ).not.toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(within(link).getAllByAltText("Oecher Meeples Logo")).toHaveLength(2);
  });
});

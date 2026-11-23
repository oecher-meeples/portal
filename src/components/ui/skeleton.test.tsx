import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Skeleton } from "./skeleton";

afterEach(cleanup);

describe("Skeleton (#460)", () => {
  it("renders a pulsing placeholder, marked busy for screen readers", () => {
    render(<Skeleton />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveAttribute("aria-busy", "true");
    expect(skeleton).toHaveAttribute("data-slot", "skeleton");
    expect(skeleton).toHaveClass("animate-pulse");
  });

  it("accepts a className to control shape/size without duplicating the component", () => {
    render(<Skeleton className="h-24 w-full rounded-full" />);

    const skeleton = screen.getByRole("status");
    expect(skeleton).toHaveClass("h-24", "w-full", "rounded-full");
    // Default rounding weicht der Aufrufer-Vorgabe (tailwind-merge, kein Duplikat).
    expect(skeleton).not.toHaveClass("rounded-md");
  });
});

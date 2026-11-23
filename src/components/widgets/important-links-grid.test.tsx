import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ImportantLinksGrid } from "@/components/widgets/important-links-grid";

afterEach(cleanup);

describe("ImportantLinksGrid — feste statt gestreckte Kartenbreite (#454)", () => {
  it("gives grid tracks a fixed width so few items don't stretch to full container width", () => {
    render(
      <ImportantLinksGrid items={[{ href: "/signal", label: "Signal" }]} />,
    );

    const grid = screen.getByText("Signal").closest("div.grid");
    // Ab `sm` das feste 200-px-Raster aus #454, darunter 2 Spalten (#584).
    expect(grid).toHaveClass(
      "sm:grid-cols-[repeat(auto-fit,minmax(200px,200px))]",
    );
  });

  it("shows exactly two tiles per row below sm (#584)", () => {
    render(
      <ImportantLinksGrid items={[{ href: "/signal", label: "Signal" }]} />,
    );

    const grid = screen.getByText("Signal").closest("div.grid");
    expect(grid).toHaveClass("grid-cols-2");
  });
});

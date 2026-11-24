import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { ColumnChart } from "@/components/ui/column-chart";

afterEach(() => {
  cleanup();
});

describe("ColumnChart (#599)", () => {
  it("exposes the values as an accessible table with long labels", () => {
    render(
      <ColumnChart
        caption="Kontrollen pro Monat"
        labelHeader="Monat"
        valueHeader="Kontrollen"
        items={[
          { key: "2026-10", label: "Okt", srLabel: "Oktober 2026", value: 2 },
          { key: "2026-11", label: "Nov", srLabel: "November 2026", value: 0 },
        ]}
      />,
    );

    const table = screen.getByRole("table", { name: "Kontrollen pro Monat" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[1]).getByText("Oktober 2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2")).toBeInTheDocument();
    expect(within(rows[2]).getByText("0")).toBeInTheDocument();
  });

  it("scales column heights relative to the largest value", () => {
    const { container } = render(
      <ColumnChart
        caption="x"
        items={[
          { key: "a", label: "A", value: 4 },
          { key: "b", label: "B", value: 1 },
          { key: "c", label: "C", value: 0 },
        ]}
      />,
    );

    const bars = [...container.querySelectorAll<HTMLElement>(".bg-primary")];
    expect(bars.map((bar) => bar.style.height)).toEqual(["100%", "25%", "0%"]);
  });
});

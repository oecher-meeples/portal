import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FilterResetRow } from "./filter-reset-row";

describe("FilterResetRow", () => {
  it("shows the value and resets on click", () => {
    const onReset = vi.fn();
    render(<FilterResetRow value="04.12.2026" onReset={onReset} />);
    expect(screen.getByText("04.12.2026")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Alle anzeigen" }));
    expect(onReset).toHaveBeenCalledOnce();
  });
});

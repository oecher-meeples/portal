import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MonthCalendar, buildMonthGrid, toDateKey } from "./month-calendar";

describe("buildMonthGrid", () => {
  it("starts on Monday, pads with nulls and fills whole weeks", () => {
    // Oktober 2026 beginnt an einem Donnerstag, hat 31 Tage.
    const cells = buildMonthGrid(new Date(2026, 9, 1));

    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 3)).toEqual([null, null, null]);
    expect(cells[3]).toEqual(new Date(2026, 9, 1));
    expect(cells.filter(Boolean)).toHaveLength(31);
  });
});

describe("toDateKey", () => {
  it("formats the local date as YYYY-MM-DD", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("MonthCalendar", () => {
  afterEach(cleanup);

  it("reports clicks on enabled days only and navigates months", () => {
    const onSelectDate = vi.fn();
    const now = new Date();
    const key = toDateKey(new Date(now.getFullYear(), now.getMonth(), 15));
    render(
      <MonthCalendar
        selectedDate={null}
        onSelectDate={onSelectDate}
        isDayEnabled={(k) => k === key}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "15" }));
    expect(onSelectDate).toHaveBeenCalledWith(key);
    expect(
      (screen.getByRole("button", { name: "14" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Nächster Monat" }));
    expect(
      (screen.getByRole("button", { name: "15" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("deselects when the selected day is clicked again", () => {
    const onSelectDate = vi.fn();
    const now = new Date();
    const key = toDateKey(new Date(now.getFullYear(), now.getMonth(), 10));
    render(
      <MonthCalendar
        selectedDate={key}
        onSelectDate={onSelectDate}
        isDayEnabled={(k) => k === key}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "10" }));
    expect(onSelectDate).toHaveBeenCalledWith(null);
  });
});

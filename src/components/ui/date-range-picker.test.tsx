import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DateRangePicker } from "./date-range-picker";
import { MONTH_NAMES } from "./date-picker-shared";

afterEach(cleanup);

const FIELD_LABEL = "Beginn – Ende";

/** Öffnet das Popup (die Feld-Beschriftung ist der Trigger-Buttons
 * Accessible Name — das `<label for>` überschreibt dessen eigenen
 * Text-Inhalt) und navigiert zur Tagesansicht des angegebenen Monats.
 * `openAt="Month"` überspringt die Jahresauswahl, ein fixes `year` reicht
 * für alle Tests hier. */
function openToDayView(monthIndex: number) {
  fireEvent.click(screen.getByRole("button", { name: FIELD_LABEL }));
  fireEvent.click(
    screen.getByRole("button", { name: MONTH_NAMES[monthIndex].slice(0, 3) }),
  );
}

function clickDay(day: number) {
  fireEvent.click(screen.getByRole("button", { name: String(day) }));
}

describe("DateRangePicker (#458)", () => {
  const YEAR = new Date().getFullYear();

  it("shows 'Zeitraum wählen' when empty", () => {
    render(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: "", end: "" }}
        onChange={vi.fn()}
        openAt="Month"
      />,
    );

    expect(screen.getByText("Zeitraum wählen")).toBeInTheDocument();
  });

  it("keeps the popup open after picking the start day, switching the prompt to 'Ende wählen'", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: "", end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );

    openToDayView(5);
    clickDay(10);

    expect(onChange).toHaveBeenCalledWith({ start: `${YEAR}-06-10`, end: "" });
    // Der Controller (Aufrufer) reicht den neuen Wert zurück, ohne das Popup
    // zu schließen — das Popup bleibt offen (kontrolliert über `open`
    // innerhalb der Komponente, unabhängig vom `value`-Rerender) und zeigt
    // jetzt die Ende-Auswahl-Beschriftung.
    rerender(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: `${YEAR}-06-10`, end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );
    expect(screen.getByText("Ende wählen")).toBeInTheDocument();
  });

  it("sets the end date on a second click after the start, closing the popup", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: "", end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );
    openToDayView(5);
    clickDay(10);
    rerender(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: `${YEAR}-06-10`, end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );

    clickDay(15);

    expect(onChange).toHaveBeenLastCalledWith({
      start: `${YEAR}-06-10`,
      end: `${YEAR}-06-15`,
    });
  });

  it("treats a second click on the same day as the start as a single-day event (no end)", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: "", end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );
    openToDayView(5);
    clickDay(10);
    rerender(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: `${YEAR}-06-10`, end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );

    clickDay(10);

    expect(onChange).toHaveBeenLastCalledWith({
      start: `${YEAR}-06-10`,
      end: "",
    });
  });

  it("swaps start and end when the second click lands before the chosen start", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: "", end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );
    openToDayView(5);
    clickDay(10);
    rerender(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: `${YEAR}-06-10`, end: "" }}
        onChange={onChange}
        openAt="Month"
      />,
    );

    clickDay(5);

    expect(onChange).toHaveBeenLastCalledWith({
      start: `${YEAR}-06-05`,
      end: `${YEAR}-06-10`,
    });
  });

  it("starts a fresh selection when clicking again on an already-complete range", () => {
    const onChange = vi.fn();
    render(
      <DateRangePicker
        id="range"
        label={FIELD_LABEL}
        value={{ start: `${YEAR}-06-10`, end: `${YEAR}-06-15` }}
        onChange={onChange}
        openAt="Month"
      />,
    );

    openToDayView(5);
    clickDay(20);

    expect(onChange).toHaveBeenCalledWith({ start: `${YEAR}-06-20`, end: "" });
  });
});

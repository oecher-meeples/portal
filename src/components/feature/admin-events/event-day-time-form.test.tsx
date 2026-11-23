import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EventDayTimeForm } from "@/components/feature/admin-events/event-day-time-form";
import { timeInputValue } from "@/components/ui/time-picker";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/components/feature/admin-events/event-day-actions", () => ({
  updateEventDayTimes: vi.fn(),
}));

afterEach(cleanup);

// #459: neue Tage kommen ohne Zeiten — 12:00 statt leerer Felder vorbelegt.
describe("EventDayTimeForm — Öffnungszeiten-Vorbelegung (#459)", () => {
  it("defaults both fields to 12:00 for a day without saved times", () => {
    render(
      <EventDayTimeForm
        day={{
          id: "day-1",
          date: "2026-10-10T00:00:00.000Z",
          startsAt: null,
          endsAt: null,
        }}
      />,
    );

    expect(screen.getByLabelText("Beginn")).toHaveValue("12:00");
    expect(screen.getByLabelText("Ende")).toHaveValue("12:00");
  });

  it("keeps already-saved times unchanged", () => {
    const startsAt = "2026-10-10T09:00:00.000Z";
    const endsAt = "2026-10-10T17:30:00.000Z";

    render(
      <EventDayTimeForm
        day={{
          id: "day-1",
          date: "2026-10-10T00:00:00.000Z",
          startsAt,
          endsAt,
        }}
      />,
    );

    // timeInputValue() rechnet in die lokale Zeitzone des Testlaufs um —
    // hier gegen dieselbe Funktion verglichen statt gegen einen
    // zeitzonenabhängigen Literal-String.
    expect(screen.getByLabelText("Beginn")).toHaveValue(
      timeInputValue(startsAt),
    );
    expect(screen.getByLabelText("Ende")).toHaveValue(timeInputValue(endsAt));
  });
});

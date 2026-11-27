import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HelferView, type HelferEventGroup } from "./helfer-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/components/feature/helfer/actions", () => ({
  confirmOwnShiftBooking: vi.fn(),
  declineOwnShiftBooking: vi.fn(),
}));
vi.mock("@/components/feature/helfer/attendance-actions", () => ({
  markAttending: vi.fn(),
  markNotAttending: vi.fn(),
}));
vi.mock("@/components/feature/helfer/availability-actions", () => ({
  setOwnHelperAvailability: vi.fn(),
  clearOwnHelperAvailability: vi.fn(),
}));

afterEach(cleanup);

function makeEvent(
  overrides: Partial<HelferEventGroup> = {},
): HelferEventGroup {
  return {
    id: "event-1",
    title: "Test",
    startsAt: "2026-10-14T10:00:00.000Z",
    endsAt: null,
    location: null,
    days: [],
    isAttendingAsExplainer: false,
    isCurrentlyRunning: false,
    ...overrides,
  };
}

describe("HelferView — Erklärbär-An-/Abmelde-Banner (#338)", () => {
  it("hides the banner for an event that hasn't started yet", () => {
    render(
      <HelferView
        events={[makeEvent({ isCurrentlyRunning: false })]}
        dayRolesByDayId={{}}
        ownAvailabilityByDayId={{}}
        assignedShifts={[]}
        guides={[]}
        isExplainer={true}
      />,
    );

    expect(screen.queryByText("Ich bin da")).not.toBeInTheDocument();
  });

  it("shows the banner while the event is currently running", () => {
    render(
      <HelferView
        events={[makeEvent({ isCurrentlyRunning: true })]}
        dayRolesByDayId={{}}
        ownAvailabilityByDayId={{}}
        assignedShifts={[]}
        guides={[]}
        isExplainer={true}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Ich bin da" }),
    ).toBeInTheDocument();
  });

  it("still hides the banner for a non-explainer, even while the event is running", () => {
    render(
      <HelferView
        events={[makeEvent({ isCurrentlyRunning: true })]}
        dayRolesByDayId={{}}
        ownAvailabilityByDayId={{}}
        assignedShifts={[]}
        guides={[]}
        isExplainer={false}
      />,
    );

    expect(screen.queryByText("Ich bin da")).not.toBeInTheDocument();
  });
});

describe("HelferView — Verfügbarkeitsformular (#674)", () => {
  function renderWithDay(
    own: { startsAt: string; endsAt: string; roleIds: string[] } | null = null,
  ) {
    render(
      <HelferView
        events={[
          makeEvent({
            days: [
              {
                id: "day-1",
                date: "2026-10-14T00:00:00.000Z",
                minMinutes: 540,
                maxMinutes: 1080,
              },
            ],
          }),
        ]}
        dayRolesByDayId={{ "day-1": [{ id: "role-1", name: "Theke" }] }}
        ownAvailabilityByDayId={own ? { "day-1": own } : {}}
        assignedShifts={[]}
        guides={[]}
        isExplainer={false}
      />,
    );
  }

  it("has no edit toggle and no save button; inputs are always usable", () => {
    renderWithDay();

    expect(screen.queryByRole("button", { name: "Bearbeiten" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Speichern/ })).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Theke" })).toBeEnabled();
  });

  it("warns without blocking when the availability is under two hours", () => {
    renderWithDay({
      startsAt: "2026-10-14T10:00:00.000Z",
      endsAt: "2026-10-14T10:30:00.000Z",
      roleIds: ["role-1"],
    });

    expect(screen.getByRole("status")).toHaveTextContent(/2 Stunden/);
  });

  it("shows no warning for the default window", () => {
    renderWithDay();

    expect(screen.queryByRole("status")).toBeNull();
  });
});

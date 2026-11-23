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
        isExplainer={false}
      />,
    );

    expect(screen.queryByText("Ich bin da")).not.toBeInTheDocument();
  });
});

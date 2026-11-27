import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HelperListRoles } from "./helper-list-roles";
import type { PoolMeeple } from "./helper-pool-bar";
import type { PlanBooking } from "@/lib/events/shift-plan-types";

afterEach(cleanup);

const role = { roleId: "r1", roleName: "Erklärer", shiftId: "s1" };

const entry = (helperId: string, displayName: string): PoolMeeple => ({
  helperId,
  isGuest: false,
  displayName,
  roleId: "r1",
  availabilityStartsAt: "2026-12-05T10:00:00.000Z",
  availabilityEndsAt: "2026-12-05T22:00:00.000Z",
});

const booking = (helperId: string, displayName: string): PlanBooking =>
  ({
    id: `b-${helperId}`,
    shiftId: "s1",
    roleId: "r1",
    dayId: "d1",
    helperId,
    isGuest: false,
    isFiller: true,
    displayName,
  }) as PlanBooking;

describe("HelperListRoles", () => {
  it("shows the count, assigned helpers with − and available ones with +", () => {
    const onAssign = vi.fn();
    const onUnassign = vi.fn();
    render(
      <HelperListRoles
        roles={[role]}
        pool={[entry("m1", "Anna"), entry("m2", "Ben")]}
        bookings={[booking("m1", "Anna")]}
        onAssign={onAssign}
        onUnassign={onUnassign}
      />,
    );

    expect(screen.getByText("Erklärer")).toBeInTheDocument();
    expect(screen.getByLabelText("1 zugewiesen")).toHaveTextContent("1");
    // Anna ist zugewiesen und daher nicht mehr verfügbar
    expect(screen.queryByRole("button", { name: "Anna zuweisen" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Anna entfernen" }));
    expect(onUnassign).toHaveBeenCalledWith(booking("m1", "Anna"));

    fireEvent.click(screen.getByRole("button", { name: "Ben zuweisen" }));
    expect(onAssign).toHaveBeenCalledWith(role, entry("m2", "Ben"));
  });

  it("renders nothing without list roles", () => {
    const { container } = render(
      <HelperListRoles
        roles={[]}
        pool={[]}
        bookings={[]}
        onAssign={vi.fn()}
        onUnassign={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

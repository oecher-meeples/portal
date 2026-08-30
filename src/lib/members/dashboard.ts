import type { HoldingOrigin } from "@prisma/client";
import { isLoanHolding } from "@/lib/ludothek/holdings";

export type DashboardHolding = {
  id: string;
  gameCopyId: string;
  vereinsmitgliedId: string | null;
  unitId: string | null;
  origin: HoldingOrigin;
  confirmedAt: Date | null;
  endedAt: Date | null;
};

export type DashboardUnit = {
  id: string;
  keeperMeepleId: string | null;
  retiredAt: Date | null;
};

export type MemberHoldingsSummary = {
  ownLoans: DashboardHolding[];
  ownUnitContents: DashboardHolding[];
  unconfirmedHandovers: DashboardHolding[];
  unconfirmedReturns: DashboardHolding[];
};

/**
 * Splits a Vereinsmitglied's stake in the ludothek into the categories the
 * member dashboard shows (#333). Only ever looks at open holdings
 * (`endedAt: null`) — a closed one never counts, regardless of what the
 * caller passed in. `meepleId` is still used for the kept-units lookup
 * (`StorageUnit.keeperMeepleId` stays a Meeple reference).
 */
export function summariseMemberHoldings(
  meepleId: string,
  vereinsmitgliedId: string | null,
  holdings: DashboardHolding[],
  units: DashboardUnit[],
): MemberHoldingsSummary {
  const openHoldings = holdings.filter((h) => h.endedAt === null);

  const keptUnitIds = new Set(
    units
      .filter((u) => u.keeperMeepleId === meepleId && !u.retiredAt)
      .map((u) => u.id),
  );

  const isOwn = (h: DashboardHolding) =>
    vereinsmitgliedId !== null && h.vereinsmitgliedId === vereinsmitgliedId;

  return {
    ownLoans: openHoldings.filter((h) => isOwn(h) && isLoanHolding(h)),
    ownUnitContents: openHoldings.filter(
      (h) => h.unitId !== null && keptUnitIds.has(h.unitId),
    ),
    unconfirmedHandovers: openHoldings.filter(
      (h) => isOwn(h) && h.origin === "HANDOVER" && !h.confirmedAt,
    ),
    unconfirmedReturns: openHoldings.filter(
      (h) => isOwn(h) && h.origin === "RETURN" && !h.confirmedAt,
    ),
  };
}

export type DashboardShiftBooking = {
  meepleId: string;
  shift: { targetEndsAt: Date };
};

/**
 * Own shift bookings for shifts that haven't ended yet — a past event's shift
 * never counts as "anstehend", regardless of when it was booked.
 */
export function countUpcomingShiftBookings(
  meepleId: string,
  bookings: DashboardShiftBooking[],
  now: Date = new Date(),
): number {
  return bookings.filter(
    (b) =>
      b.meepleId === meepleId &&
      b.shift.targetEndsAt.getTime() >= now.getTime(),
  ).length;
}

export type DashboardEvent = {
  endsAt: Date | null;
};

/** An event is "active" while it has no end date yet, or hasn't ended. */
export function countActiveEvents(
  events: DashboardEvent[],
  now: Date = new Date(),
): number {
  return events.filter(
    (e) => e.endsAt === null || e.endsAt.getTime() >= now.getTime(),
  ).length;
}

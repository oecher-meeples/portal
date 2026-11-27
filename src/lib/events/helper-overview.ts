import type { ProfilePictureVisibility } from "@prisma/client";

export type OverviewAvailability = {
  helperId: string;
  isGuest?: boolean;
  displayName: string;
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
  dayDate: string;
  startsAt: string;
  endsAt: string;
  roleIds: string[];
};

export type OverviewBooking = {
  helperId: string;
  startsAt: string;
  endsAt: string;
};

export type HelperOverviewRow = {
  dayDate: string;
  startsAt: string;
  endsAt: string;
  roleNames: string[];
  /** Ganze Prozent (0–100) der angebotenen Zeit dieses Tages, die verplant ist. */
  utilizationPercent: number;
};

export type HelperOverviewGroup = {
  helperId: string;
  isGuest: boolean;
  displayName: string;
  profilePictureUrl: string | null;
  profilePictureVisibility: ProfilePictureVisibility;
  /** `rows.length` = `rowSpan` der Bild+Name-Zelle. */
  rows: HelperOverviewRow[];
};

const MINUTE_MS = 60_000;

/** Minuten der Buchungen innerhalb des Fensters; Überlappungen zählen einmal. */
function bookedMinutesWithin(
  window: { startsAt: string; endsAt: string },
  bookings: OverviewBooking[],
): number {
  const from = new Date(window.startsAt).getTime();
  const to = new Date(window.endsAt).getTime();
  const spans = bookings
    .map((b) => [
      Math.max(from, new Date(b.startsAt).getTime()),
      Math.min(to, new Date(b.endsAt).getTime()),
    ])
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);

  let total = 0;
  let cursor = from;
  for (const [start, end] of spans) {
    const effectiveStart = Math.max(start, cursor);
    if (end > effectiveStart) {
      total += end - effectiveStart;
      cursor = end;
    }
  }
  return total / MINUTE_MS;
}

/** Auslastung eines Tages in ganzen Prozent, defensiv auf 0–100 begrenzt. */
export function dayUtilizationPercent(
  window: { startsAt: string; endsAt: string },
  bookings: OverviewBooking[],
): number {
  const offered =
    (new Date(window.endsAt).getTime() - new Date(window.startsAt).getTime()) /
    MINUTE_MS;
  if (offered <= 0) return 0;
  const percent = Math.round(
    (bookedMinutesWithin(window, bookings) / offered) * 100,
  );
  return Math.min(100, Math.max(0, percent));
}

/**
 * Helfer-Übersicht des Admin-Events (#692): eine Zeile je (Meeple, Tag),
 * nach Person (`displayName`), dann Tag aufsteigend sortiert, damit die
 * Zeilen einer Person direkt aufeinanderfolgen (`rowSpan`).
 */
export function buildHelperOverview(
  availabilities: OverviewAvailability[],
  bookings: OverviewBooking[],
  roleNames: Map<string, string>,
): HelperOverviewGroup[] {
  const sorted = [...availabilities].sort(
    (a, b) =>
      a.displayName.localeCompare(b.displayName, "de") ||
      a.helperId.localeCompare(b.helperId) ||
      a.dayDate.localeCompare(b.dayDate),
  );

  const groups: HelperOverviewGroup[] = [];
  for (const entry of sorted) {
    let group = groups.at(-1);
    if (group?.helperId !== entry.helperId) {
      group = {
        helperId: entry.helperId,
        isGuest: entry.isGuest ?? false,
        displayName: entry.displayName,
        profilePictureUrl: entry.profilePictureUrl,
        profilePictureVisibility: entry.profilePictureVisibility,
        rows: [],
      };
      groups.push(group);
    }
    group.rows.push({
      dayDate: entry.dayDate,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
      roleNames: entry.roleIds.map((id) => roleNames.get(id) ?? id),
      utilizationPercent: dayUtilizationPercent(
        entry,
        bookings.filter((b) => b.helperId === entry.helperId),
      ),
    });
  }
  return groups;
}

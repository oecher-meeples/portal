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
  /** Verplante bzw. angebotene Minuten dieses Tages (Basis der Prozentzahl). */
  bookedMinutes: number;
  offeredMinutes: number;
};

function formatHours(minutes: number): string {
  return Number((minutes / 60).toFixed(2)).toLocaleString("de-DE");
}

/** "2/4h (50%)" — verplante/angebotene Stunden und Prozent. */
export function formatUtilization(
  row: Pick<
    HelperOverviewRow,
    "bookedMinutes" | "offeredMinutes" | "utilizationPercent"
  >,
): string {
  return `${formatHours(row.bookedMinutes)}/${formatHours(row.offeredMinutes)}h (${row.utilizationPercent}%)`;
}

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

/** Durchschnitt der verplanten Minuten je Helfer-Tag (eine Tabellenzeile). */
export function averageBookedMinutes(groups: HelperOverviewGroup[]): number {
  const rows = groups.flatMap((group) => group.rows);
  if (rows.length === 0) return 0;
  return rows.reduce((sum, row) => sum + row.bookedMinutes, 0) / rows.length;
}

/** Verplante Minuten einer Person über alle ihre Tage. */
export function totalBookedMinutes(group: HelperOverviewGroup): number {
  return group.rows.reduce((sum, row) => sum + row.bookedMinutes, 0);
}

/** Durchschnitt der Gesamt-Minuten je Person (über alle Tage). */
export function averageBookedMinutesPerHelper(
  groups: HelperOverviewGroup[],
): number {
  if (groups.length === 0) return 0;
  return (
    groups.reduce((sum, group) => sum + totalBookedMinutes(group), 0) /
    groups.length
  );
}

/** Verlauf Rot (0 h) → Grün (Durchschnitt und darüber) als CSS-Farbe. Ist der
 * Durchschnitt 0, sind alle gleichauf und damit grün. */
export function utilizationColor(
  bookedMinutes: number,
  averageMinutes: number,
): string {
  const ratio =
    averageMinutes <= 0 ? 1 : Math.min(1, bookedMinutes / averageMinutes);
  return `hsl(${Math.round(ratio * 120)} 70% 45%)`;
}

/** "2,5h" — Stunden mit deutschem Komma. */
export function formatHoursLabel(minutes: number): string {
  return `${formatHours(minutes)}h`;
}

/** Angebotene Minuten eines Zeitfensters. */
function offeredMinutesOf(window: { startsAt: string; endsAt: string }) {
  return Math.max(
    0,
    (new Date(window.endsAt).getTime() - new Date(window.startsAt).getTime()) /
      MINUTE_MS,
  );
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
    const dayBookings = bookings.filter((b) => b.helperId === entry.helperId);
    group.rows.push({
      dayDate: entry.dayDate,
      startsAt: entry.startsAt,
      endsAt: entry.endsAt,
      roleNames: entry.roleIds.map((id) => roleNames.get(id) ?? id),
      utilizationPercent: dayUtilizationPercent(entry, dayBookings),
      bookedMinutes: bookedMinutesWithin(entry, dayBookings),
      offeredMinutes: offeredMinutesOf(entry),
    });
  }
  return groups;
}

/** Tageseinträge (Tabellenzeilen) je Seite der Helfer-Tabelle. */
export const OVERVIEW_PAGE_ROWS = 20;

export type OverviewFilter = {
  /** `dayDate` eines Tages oder `null` für alle Tage. */
  dayDate: string | null;
  /** Rollenname oder `null` für alle Rollen. */
  roleName: string | null;
  /** Namenssuche (Teilstring, ohne Groß-/Kleinschreibung); leer = alle. */
  query?: string;
};

/** Behält je Person nur die Tageseinträge, die Tag- und Rollenfilter
 * erfüllen; Personen ohne passenden Eintrag entfallen. */
export function filterOverviewGroups(
  groups: HelperOverviewGroup[],
  filter: OverviewFilter,
): HelperOverviewGroup[] {
  const query = filter.query?.trim().toLowerCase() ?? "";
  return groups
    .filter(
      (group) => !query || group.displayName.toLowerCase().includes(query),
    )
    .map((group) => ({
      ...group,
      rows: group.rows.filter(
        (row) =>
          (filter.dayDate === null || row.dayDate === filter.dayDate) &&
          (filter.roleName === null || row.roleNames.includes(filter.roleName)),
      ),
    }))
    .filter((group) => group.rows.length > 0);
}

/** Teilt Personen so auf Seiten auf, dass keine Person auf zwei Seiten
 * landet und eine Seite höchstens `maxRows` Tageseinträge hat. Eine einzelne
 * Person mit mehr Einträgen bekommt eine eigene (längere) Seite. */
export function paginateOverviewGroups(
  groups: HelperOverviewGroup[],
  maxRows = OVERVIEW_PAGE_ROWS,
): HelperOverviewGroup[][] {
  const pages: HelperOverviewGroup[][] = [];
  let current: HelperOverviewGroup[] = [];
  let used = 0;
  for (const group of groups) {
    if (current.length > 0 && used + group.rows.length > maxRows) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(group);
    used += group.rows.length;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

/** Wertebereich der Filter: alle vorkommenden Tage und Rollen. */
export function overviewFilterOptions(groups: HelperOverviewGroup[]) {
  const rows = groups.flatMap((group) => group.rows);
  return {
    days: [...new Set(rows.map((row) => row.dayDate))].sort(),
    roles: [...new Set(rows.flatMap((row) => row.roleNames))].sort((a, b) =>
      a.localeCompare(b, "de"),
    ),
  };
}

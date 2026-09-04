import type {
  ExplainerExperienceLevel,
  FleaMarketItemStatus,
} from "@prisma/client";
import type { MembershipState } from "@/lib/members/meeples";
import type { InviteStatus } from "@/lib/members/invites";

/**
 * German wording for domain enums lives here — it is domain vocabulary.
 * How a state *looks* (colour/tone) is a display concern and lives in
 * src/components/entities/*-pill.tsx instead.
 */
export const MEMBERSHIP_STATE_LABELS: Record<MembershipState, string> = {
  unregistriert: "Unregistriert",
  registriert: "Registriert",
  gekuendigt: "Kündigung vorliegend",
  ausgetreten: "Ausgetreten",
  anonymisiert: "Anonymisiert",
};

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  offen: "Offen",
  eingeloest: "Eingelöst",
  abgelaufen: "Abgelaufen",
  widerrufen: "Widerrufen",
};

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/** Reused formatters — instantiate once, not per render. */
const DATE_TIME = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "short",
  timeStyle: "short",
});
const DATE_MEDIUM = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" });
const DATE_PLAIN = new Intl.DateTimeFormat("de-DE");
const TIME_PLAIN = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
});
const WEEKDAY_LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long" });
const DAY_MONTH = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
});
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

type DateInput = string | number | Date;

/** "01.02.26, 14:30" */
export function formatDateTime(value: DateInput) {
  return DATE_TIME.format(new Date(value));
}

/** "1. Feb. 2026" */
export function formatDateMedium(value: DateInput) {
  return DATE_MEDIUM.format(new Date(value));
}

/** "1.2.2026" — locale default */
export function formatDatePlain(value: DateInput) {
  return DATE_PLAIN.format(new Date(value));
}

/** "14:30" */
export function formatTimePlain(value: DateInput) {
  return TIME_PLAIN.format(new Date(value));
}

/** "Donnerstag, den 27.08.2026" — Tagesüberschrift im Helferplan-Akkordion,
 * auch für die "Tag"-Auswahl im Schicht-Dialog (#435). Mit Jahr, damit z. B.
 * eine Jahreswechsel-Schicht eindeutig bleibt. */
export function formatWeekdayDate(value: DateInput) {
  const date = new Date(value);
  return `${WEEKDAY_LONG.format(date)}, den ${DAY_MONTH_YEAR.format(date)}`;
}

/** "Donnerstag 27.08, 18:00 – 22:00" — Helferplan: zugewiesene Schicht,
 * Beginn und Ende liegen immer am selben Tag. */
export function formatWeekdayDateTimeRange(
  startsAt: DateInput,
  endsAt: DateInput,
) {
  const start = new Date(startsAt);
  const dayMonth = DAY_MONTH.format(start).replace(/\.$/, "");
  return `${WEEKDAY_LONG.format(start)} ${dayMonth}, ${formatTimePlain(startsAt)} – ${formatTimePlain(endsAt)}`;
}

/** "14:30 – 18:00" — pure time-of-day range, kein Datum. Für Tabellen, in
 * denen der Tag schon in einer eigenen Spalte steht (Schichten-Tabelle). */
export function formatTimeRange(startsAt: DateInput, endsAt: DateInput) {
  return `${formatTimePlain(startsAt)} – ${formatTimePlain(endsAt)}`;
}

/** "01.02.26, 14:30 – 18:00" — the timeframe pattern used across event views. */
export function formatDateTimeRange(
  startsAt: DateInput,
  endsAt: DateInput | null,
) {
  if (!endsAt) return formatDateTime(startsAt);
  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
}

/** "10.10.2026" or "10.10.2026 – 12.10.2026" — a pure date range, no time-of-day.
 * Used for `Event.startsAt`/`endsAt` (#150), which carry no meaningful time. */
export function formatDateRange(startsAt: DateInput, endsAt: DateInput | null) {
  if (!endsAt) return formatDatePlain(startsAt);
  return `${formatDatePlain(startsAt)} – ${formatDatePlain(endsAt)}`;
}

/** "12,3 MB" — binary (1024-based) units, one decimal, German locale separator. */
export function formatBytes(bytes: number): string {
  const UNITS = ["B", "KB", "MB", "GB", "TB"];
  if (bytes < 1024) return `${bytes} B`;

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(value)} ${UNITS[unitIndex]}`;
}

export const EXPLAINER_EXPERIENCE_LEVEL_LABELS: Record<
  ExplainerExperienceLevel,
  string
> = {
  WITH_MANUAL: "Mit Anleitung",
  WITHOUT_MANUAL: "Ohne Anleitung",
  BY_HEART: "Im Schlaf",
};

export const FLEA_MARKET_ITEM_STATUS_LABELS: Record<
  FleaMarketItemStatus,
  string
> = {
  PENDING: "Wartet auf Freigabe",
  FOR_SALE: "Im Verkauf",
  RESERVED: "Reserviert",
  SOLD: "Verkauft",
  PAID_OUT: "Ausgezahlt",
  RETURNED: "Zurückgegeben",
  DONATED: "Gespendet",
};

import type { StatusTone } from "@/components/ui/status-pill";
import type { MembershipState } from "@/lib/meeples";

export const MEMBERSHIP_STATE_LABELS: Record<MembershipState, string> = {
  aktiv: "Aktives Mitglied",
  gekuendigt: "Kündigung vorliegend",
  ausgetreten: "Ausgetreten",
  anonymisiert: "Anonymisiert",
};

export const MEMBERSHIP_STATE_TONES: Record<MembershipState, StatusTone> = {
  aktiv: "positive",
  gekuendigt: "warning",
  ausgetreten: "negative",
  anonymisiert: "neutral",
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

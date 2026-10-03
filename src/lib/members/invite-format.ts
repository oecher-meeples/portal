import { formatDateTime } from "@/lib/utils/format";

export type InviteStatus = "offen" | "eingeloest" | "abgelaufen" | "widerrufen";

type InviteLifecycleFields = {
  redeemedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
};

/** Precedence matters: a redeemed invite stays "eingelöst" even once expired. */
export function inviteStatus(
  invite: InviteLifecycleFields,
  now: Date = new Date(),
): InviteStatus {
  if (invite.revokedAt) return "widerrufen";
  if (invite.redeemedAt) return "eingeloest";
  if (invite.expiresAt < now) return "abgelaufen";
  return "offen";
}

/** No fixed minimum — any value greater than zero is a valid validity period. */
export const MIN_INVITE_DAYS = 0;
export const MAX_INVITE_DAYS = 183;
/** Fallback only for callers that can't read `InviteSettings` (e.g. pure unit
 * tests) — the admin-configured default (`getDefaultInviteDays()`) wins in the UI. */
export const DEFAULT_BOUND_DAYS = 7;

/** Rounded up so a fractional day (e.g. 2.5) never resolves to less validity
 * than requested. */
export function daysToMinutes(days: number): number {
  return Math.ceil(days * 24 * 60);
}

export function computeExpiresAt(
  expiresInMinutes: number,
  now: Date = new Date(),
): Date {
  return new Date(now.getTime() + expiresInMinutes * 60 * 1000);
}

/** The registration URL for an invite — shared so every place that links to
 * `/registrieren` builds it the same way, with the bound `email` pre-filled.
 * Plain string building, not `new URL()`, so an empty `origin` (SSR, before
 * `window.location` is known) still yields a valid relative link. */
export function buildRegistrationLink(
  origin: string,
  token: string,
  email: string,
): string {
  return `${origin}/registrieren?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/** Shared by the "Per Mail versenden" and "Einladung kopieren" buttons — the
 * text a prospective member receives to register via an invite link. */
export function formatInviteMessage(link: string, expiresAt: Date): string {
  return `Hallo!\n\nDu bist eingeladen, dem Oecher-Meeples-Portal beizutreten. Registriere dich über diesen Link:\n${link}\n\nDer Link ist gültig bis ${formatDateTime(expiresAt)}.`;
}

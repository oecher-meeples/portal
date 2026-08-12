import { prisma } from "@/lib/utils/prisma";
import { formatDateTime } from "@/lib/utils/format";

export type InviteValidation =
  | { valid: true }
  | { valid: false; reason: "not_found" | "expired" | "redeemed" | "revoked" };

export async function validateInviteToken(
  token: string,
): Promise<InviteValidation> {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) {
    return { valid: false, reason: "not_found" };
  }
  if (invite.revokedAt) {
    return { valid: false, reason: "revoked" };
  }
  if (invite.redeemedAt) {
    return { valid: false, reason: "redeemed" };
  }
  if (invite.expiresAt < new Date()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true };
}

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

export type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  createdByDisplayName: string;
  createdAt: Date;
  expiresIn: number;
  expiresAt: Date;
  redeemedAt: Date | null;
  revokedAt: Date | null;
  status: InviteStatus;
};

/** All invites, newest first — the admin overview of who's still open, used or revoked. */
export async function listInvites(
  now: Date = new Date(),
): Promise<InviteRow[]> {
  const invites = await prisma.invite.findMany({
    orderBy: { createdAt: "desc" },
  });
  if (invites.length === 0) return [];

  const creatorIds = [
    ...new Set(invites.map((invite) => invite.createdByUserId)),
  ];
  const creators = await prisma.meeple.findMany({
    where: { neonAuthUserId: { in: creatorIds } },
    select: { neonAuthUserId: true, displayName: true },
  });
  const nameByUserId = new Map(
    creators.map((creator) => [creator.neonAuthUserId!, creator.displayName]),
  );

  return invites.map((invite) => ({
    id: invite.id,
    token: invite.token,
    email: invite.email,
    createdByDisplayName:
      nameByUserId.get(invite.createdByUserId) ?? "Unbekannt",
    createdAt: invite.createdAt,
    expiresIn: invite.expiresIn,
    expiresAt: invite.expiresAt,
    redeemedAt: invite.redeemedAt,
    revokedAt: invite.revokedAt,
    status: inviteStatus(invite, now),
  }));
}

/** Looks up a still-open *bound* invite for an email, so creating a new one for
 * the same address extends it instead of issuing a second, redundant invite. */
export async function findOpenInviteByEmail(email: string, now = new Date()) {
  const invite = await prisma.invite.findFirst({
    where: { email, redeemedAt: null, revokedAt: null, expiresAt: { gt: now } },
  });
  return invite;
}

/** No fixed minimum — any value greater than zero is a valid validity period. */
export const MIN_INVITE_DAYS = 0;
export const MAX_INVITE_DAYS = 183;
export const DEFAULT_BOUND_DAYS = 7;
export const DEFAULT_UNBOUND_DAYS = 1;

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
 * `/registrieren` builds it the same way (with `email` for bound invites).
 * Plain string building, not `new URL()`, so an empty `origin` (SSR, before
 * `window.location` is known) still yields a valid relative link. */
export function buildRegistrationLink(
  origin: string,
  token: string,
  email: string | null,
): string {
  const emailParam = email ? `&email=${encodeURIComponent(email)}` : "";
  return `${origin}/registrieren?token=${encodeURIComponent(token)}${emailParam}`;
}

/** Shared by the "Per Mail versenden" and "Einladung kopieren" buttons — the
 * text a prospective member receives to register via an invite link. */
export function formatInviteMessage(link: string, expiresAt: Date): string {
  return `Hallo!\n\nDu bist eingeladen, dem Oecher-Meeples-Portal beizutreten. Registriere dich über diesen Link:\n${link}\n\nDer Link ist gültig bis ${formatDateTime(expiresAt)}.`;
}

import { prisma } from "@/lib/utils/prisma";
import { inviteStatus, type InviteStatus } from "@/lib/members/invite-format";

export {
  type InviteStatus,
  inviteStatus,
  MIN_INVITE_DAYS,
  MAX_INVITE_DAYS,
  DEFAULT_BOUND_DAYS,
  daysToMinutes,
  computeExpiresAt,
  buildRegistrationLink,
  formatInviteMessage,
} from "@/lib/members/invite-format";

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

export type InviteRow = {
  id: string;
  token: string;
  email: string;
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

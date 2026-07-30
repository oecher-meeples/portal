import { prisma } from "@/lib/utils/prisma";

export type InviteValidation =
  | { valid: true }
  | { valid: false; reason: "not_found" | "expired" | "redeemed" };

export async function validateInviteToken(
  token: string,
): Promise<InviteValidation> {
  const invite = await prisma.invite.findUnique({ where: { token } });

  if (!invite) {
    return { valid: false, reason: "not_found" };
  }
  if (invite.redeemedAt) {
    return { valid: false, reason: "redeemed" };
  }
  if (invite.expiresAt < new Date()) {
    return { valid: false, reason: "expired" };
  }

  return { valid: true };
}

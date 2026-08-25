"use server";

import { prisma } from "@/lib/utils/prisma";
import { auth } from "@/lib/auth/server";
import { validateInviteToken } from "@/lib/members/invites";
import { translateAuthError, validatePassword } from "@/lib/auth/password";

const DEFAULT_ROLE = "Meeple";

export async function redeemInvite({
  token,
  email,
  password,
  name,
}: {
  token: string;
  email: string;
  password: string;
  name: string;
}) {
  const validation = await validateInviteToken(token);
  if (!validation.valid) {
    return { error: "Token ungültig oder abgelaufen." };
  }

  const invite = await prisma.invite.findUniqueOrThrow({ where: { token } });
  if (invite.email && invite.email !== email.trim().toLowerCase()) {
    return {
      error: "Diese Einladung ist an eine andere E-Mail-Adresse gebunden.",
    };
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return { error: passwordError };
  }

  const { data, error } = await auth.signUp.email({ email, password, name });
  if (error || !data?.user) {
    return { error: translateAuthError(error?.message) };
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: { name: DEFAULT_ROLE },
  });

  // Unbound invites (invite.email === null) stay redeemable by anyone until
  // expiry — the row is deliberately left untouched, no redemption tracking.
  await prisma.$transaction([
    ...(invite.email
      ? [
          prisma.invite.update({
            where: { token },
            data: { redeemedAt: new Date() },
          }),
        ]
      : []),
    prisma.userRole.create({
      data: { neonAuthUserId: data.user.id, roleId: role.id },
    }),
  ]);

  return { success: true as const };
}

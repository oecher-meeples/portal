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
  if (invite.email !== email.trim().toLowerCase()) {
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

  // #329: eine Einladung ist immer an ein bestehendes `Member` gebunden — der
  // Meeple entsteht hier direkt (statt erst beim nächsten `ensureMeeple()`),
  // damit `Member.meepleId` sofort verknüpft ist, nicht erst nach dem ersten
  // weiteren Seitenaufruf.
  await prisma.$transaction(async (tx) => {
    await tx.invite.update({
      where: { token },
      data: { redeemedAt: new Date() },
    });
    await tx.userRole.create({
      data: { neonAuthUserId: data.user.id, roleId: role.id },
    });

    const member = await tx.member.findUnique({ where: { email: invite.email } });
    const displayName =
      [member?.firstName, member?.lastName].filter(Boolean).join(" ") ||
      name.trim() ||
      email.split("@")[0];

    const meeple = await tx.meeple.upsert({
      where: { neonAuthUserId: data.user.id },
      update: { displayName },
      create: { neonAuthUserId: data.user.id, displayName },
    });

    if (member && !member.meepleId) {
      await tx.member.update({
        where: { id: member.id },
        data: { meepleId: meeple.id },
      });
    }
  });

  return { success: true as const };
}

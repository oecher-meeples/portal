"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/server";
import { validateInviteToken } from "@/lib/invites";

const DEFAULT_ROLE = "mitglied";

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

  const { data, error } = await auth.signUp.email({ email, password, name });
  if (error || !data?.user) {
    return { error: error?.message ?? "Registrierung fehlgeschlagen." };
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: { name: DEFAULT_ROLE },
  });

  await prisma.$transaction([
    prisma.invite.update({
      where: { token },
      data: { redeemedAt: new Date() },
    }),
    prisma.userRole.create({
      data: { neonAuthUserId: data.user.id, roleId: role.id },
    }),
  ]);

  return { success: true as const };
}

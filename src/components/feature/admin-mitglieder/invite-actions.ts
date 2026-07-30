"use server";

import { randomBytes } from "node:crypto";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";

const INVITE_TTL_DAYS = 7;

export async function createInvite() {
  const admin = await requirePermission("invites:create");

  const invite = await prisma.invite.create({
    data: {
      token: randomBytes(24).toString("hex"),
      createdByUserId: admin.id,
      expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });

  return { token: invite.token, expiresAt: invite.expiresAt.toISOString() };
}

"use server";

import { revalidatePath } from "next/cache";
import {
  actionPermissionDenied,
  requireActionPermission,
} from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { MAX_INVITE_DAYS, MIN_INVITE_DAYS } from "@/lib/members/invites";
import { setDefaultInviteDays } from "@/lib/members/invite-settings";

export async function disconnectInstagram() {
  const denied = await actionPermissionDenied("instagram:connect");
  if (denied) return denied;

  await prisma.instagramConnection.deleteMany();
  return { success: true as const };
}

export async function updateDefaultInviteDays(days: number) {
  await requireActionPermission("invites:manage");

  if (!(days > MIN_INVITE_DAYS) || days > MAX_INVITE_DAYS) {
    return {
      error: `Die Gültigkeitsdauer muss zwischen ${MIN_INVITE_DAYS} und ${MAX_INVITE_DAYS} Tagen liegen.`,
    };
  }

  await setDefaultInviteDays(days);
  revalidatePath("/admin/einstellungen/einladungen");
  return { success: true as const };
}

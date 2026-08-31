"use server";

import { revalidatePath } from "next/cache";
import { PendingChangeKind } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";
import {
  approvePendingChange as approvePendingChangeRecord,
  hasOpenInviteForMemberEmail,
  rejectPendingChange as rejectPendingChangeRecord,
} from "@/lib/members/pending-changes";

/** IBAN: Kassenwart (`bank:read`). MEMBER_EMAIL: Vorstand (`members:manage`) —
 * dieselbe Berechtigung, die auch Kündigungen vermerkt. */
async function requireApproverFor(kind: PendingChangeKind) {
  return kind === PendingChangeKind.IBAN
    ? requirePermission("bank:read")
    : requirePermission("members:manage");
}

async function revalidateProfilePage(memberId: string) {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { slug: true },
  });
  if (member) revalidatePath(`/mitglied/${member.slug}`);
}

export async function approvePendingChange(
  id: string,
  options?: { revokeAndReissueInvite?: boolean },
) {
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change) return { error: "Änderungsantrag nicht gefunden." };

  const actor = await requireApproverFor(change.kind);
  const result = await approvePendingChangeRecord(id, actor.id, options);
  if ("error" in result) return result;

  revalidatePath("/admin/bank");
  revalidatePath("/admin/mitglieder");
  await revalidateProfilePage(change.memberId);
  return { success: true as const };
}

/** #362: vor der Freigabe geprüft, um das Widerrufen-und-neu-erstellen-Popup
 * nur zu zeigen, wenn tatsächlich eine offene Einladung betroffen wäre. */
export async function checkOpenInviteBeforeApproval(id: string) {
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change || change.kind !== PendingChangeKind.MEMBER_EMAIL) return false;

  await requireApproverFor(change.kind);
  return hasOpenInviteForMemberEmail(change.memberId);
}

export async function rejectPendingChange(id: string, reason: string) {
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change) return { error: "Änderungsantrag nicht gefunden." };

  const actor = await requireApproverFor(change.kind);
  const result = await rejectPendingChangeRecord(id, actor.id, reason);
  if ("error" in result) return result;

  revalidatePath("/admin/bank");
  revalidatePath("/admin/mitglieder");
  await revalidateProfilePage(change.memberId);
  return { success: true as const };
}

"use server";

import { revalidatePath } from "next/cache";
import { PendingChangeKind } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { prisma } from "@/lib/utils/prisma";
import {
  approvePendingChange as approvePendingChangeRecord,
  rejectPendingChange as rejectPendingChangeRecord,
} from "@/lib/members/pending-changes";

/** IBAN: Kassenwart (`bank:read`). MEMBER_EMAIL: Vorstand (`members:manage`) —
 * dieselbe Berechtigung, die auch Kündigungen vermerkt. */
async function requireApproverFor(kind: PendingChangeKind) {
  return kind === PendingChangeKind.IBAN
    ? requirePermission("bank:read")
    : requirePermission("members:manage");
}

export async function approvePendingChange(id: string) {
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change) return { error: "Änderungsantrag nicht gefunden." };

  const actor = await requireApproverFor(change.kind);
  const result = await approvePendingChangeRecord(id, actor.id);
  if ("error" in result) return result;

  revalidatePath("/admin/bank");
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function rejectPendingChange(id: string, reason: string) {
  const change = await prisma.pendingChange.findUnique({ where: { id } });
  if (!change) return { error: "Änderungsantrag nicht gefunden." };

  const actor = await requireApproverFor(change.kind);
  const result = await rejectPendingChangeRecord(id, actor.id, reason);
  if ("error" in result) return result;

  revalidatePath("/admin/bank");
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

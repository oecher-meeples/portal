"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createMember as createMemberRecord,
  type CreateMemberInput,
} from "@/lib/members/create-member";
import {
  updateMember as updateMemberRecord,
  type UpdateMemberInput,
} from "@/lib/members/update-member";
import { sendSelbstauskunftMail } from "@/lib/members/selbstauskunft-mail";
import {
  addGuardianLink,
  listGuardianCandidates,
  listGuardiansOf,
  removeGuardianLink,
} from "@/lib/members/guardians";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

/** Vereinsmitglied-zentrische Mutationen (#342/#343) — bewusst getrennt von
 * `actions.ts`, das Meeple-zentrisch ist (siehe `vereinsmitglied-row.ts` vs.
 * `meeple-row.ts`). */
export async function createMember(input: CreateMemberInput) {
  await requireMembersManage();

  const result = await createMemberRecord(input);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function updateMember(memberId: string, input: UpdateMemberInput) {
  await requireMembersManage();

  const result = await updateMemberRecord(memberId, input);
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

/** Verschoben aus der Meeple-Tabelle ins Vereinsmitglied-Edit (#343) — bleibt
 * meepleId-basiert, weil sie Meeple-Selbstauskunftsdaten sammelt
 * (`collectMeeplePersonalData`); ohne Portal-Konto gibt es nichts zu
 * sammeln, der Aufrufer blendet den Button dafür aus. */
export async function sendSelbstauskunft(meepleId: string) {
  await requireMembersManage();

  return sendSelbstauskunftMail(meepleId);
}

/** Guardian-Verwaltung (#372) — `members:manage`-gated wie andere Kernfelder
 * auf `Member`. Liefert die aktuell verknüpften Erziehungsberechtigten plus
 * alle übrigen Members als Auswahlkandidaten in einem Aufruf. */
export async function listGuardianManagement(childMemberId: string) {
  await requireMembersManage();

  const [guardians, candidates] = await Promise.all([
    listGuardiansOf(childMemberId),
    listGuardianCandidates(childMemberId),
  ]);
  return { guardians, candidates };
}

export async function addGuardian(
  childMemberId: string,
  guardianMemberId: string,
) {
  await requireMembersManage();

  await addGuardianLink(childMemberId, guardianMemberId);
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

export async function removeGuardian(
  childMemberId: string,
  guardianMemberId: string,
) {
  await requireMembersManage();

  await removeGuardianLink(childMemberId, guardianMemberId);
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

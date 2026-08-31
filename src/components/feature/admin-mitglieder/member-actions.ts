"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createMember as createMemberRecord,
  type CreateMemberInput,
} from "@/lib/members/create-member";

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

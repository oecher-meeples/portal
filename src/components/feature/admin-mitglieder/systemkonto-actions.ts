"use server";

import { revalidatePath } from "next/cache";
import { createSystemkonto as createSystemkontoRecord } from "@/lib/members/systemkonto";

export async function createSystemkonto({
  email,
  displayName,
}: {
  email: string;
  displayName: string;
}) {
  const result = await createSystemkontoRecord({ email, displayName });
  if ("error" in result) return result;

  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

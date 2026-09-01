"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createTshirtSize as createTshirtSizeRecord,
  deleteTshirtSize as deleteTshirtSizeRecord,
  listTshirtSizes,
  renameTshirtSize as renameTshirtSizeRecord,
  reorderTshirtSizes as reorderTshirtSizesRecord,
} from "@/lib/members/tshirt-sizes";

async function requireMembersManage() {
  return requirePermission("members:manage");
}

export async function loadTshirtSizes() {
  await requireMembersManage();
  return listTshirtSizes();
}

export async function createTshirtSize(label: string) {
  await requireMembersManage();

  const result = await createTshirtSizeRecord(label);
  if ("error" in result) return result;

  revalidatePath("/admin/einstellungen");
  return { success: true as const };
}

export async function renameTshirtSize(id: string, label: string) {
  await requireMembersManage();

  const result = await renameTshirtSizeRecord(id, label);
  if ("error" in result) return result;

  revalidatePath("/admin/einstellungen");
  return { success: true as const };
}

export async function reorderTshirtSizes(orderedIds: string[]) {
  await requireMembersManage();

  await reorderTshirtSizesRecord(orderedIds);
  revalidatePath("/admin/einstellungen");
  return { success: true as const };
}

export async function deleteTshirtSize(id: string) {
  await requireMembersManage();

  await deleteTshirtSizeRecord(id);
  revalidatePath("/admin/einstellungen");
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

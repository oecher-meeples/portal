"use server";

import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/auth/action-guards";
import {
  createTshirtSize as createTshirtSizeRecord,
  deleteTshirtSize as deleteTshirtSizeRecord,
  listTshirtSizes,
  renameTshirtSize as renameTshirtSizeRecord,
  reorderTshirtSizes as reorderTshirtSizesRecord,
} from "@/lib/members/tshirt-sizes";

export async function loadTshirtSizes() {
  await requireActionPermission("members:manage");
  return listTshirtSizes();
}

export async function createTshirtSize(label: string) {
  await requireActionPermission("members:manage");

  const result = await createTshirtSizeRecord(label);
  if ("error" in result) return result;

  revalidatePath("/admin/einstellungen");
  return { success: true as const };
}

export async function renameTshirtSize(id: string, label: string) {
  await requireActionPermission("members:manage");

  const result = await renameTshirtSizeRecord(id, label);
  if ("error" in result) return result;

  revalidatePath("/admin/einstellungen");
  return { success: true as const };
}

export async function reorderTshirtSizes(orderedIds: string[]) {
  await requireActionPermission("members:manage");

  await reorderTshirtSizesRecord(orderedIds);
  revalidatePath("/admin/einstellungen");
  return { success: true as const };
}

export async function deleteTshirtSize(id: string) {
  await requireActionPermission("members:manage");

  await deleteTshirtSizeRecord(id);
  revalidatePath("/admin/einstellungen");
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}

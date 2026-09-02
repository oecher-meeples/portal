"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createHelperRole,
  updateHelperRole,
  deleteHelperRole,
} from "@/lib/events/helper-roles";

export async function createHelperRoleAction(
  name: string,
  grantsPermissionKey: string | null,
) {
  await requirePermission("events:manage");

  const result = await createHelperRole(name, grantsPermissionKey);
  if ("error" in result) return result;

  revalidatePath("/admin/events");
  return { success: true as const };
}

export async function updateHelperRoleAction(
  roleId: string,
  name: string,
  grantsPermissionKey: string | null,
) {
  await requirePermission("events:manage");

  const result = await updateHelperRole(roleId, name, grantsPermissionKey);
  if ("error" in result) return result;

  revalidatePath("/admin/events");
  return { success: true as const };
}

export async function deleteHelperRoleAction(roleId: string) {
  await requirePermission("events:manage");

  const result = await deleteHelperRole(roleId);
  if ("error" in result) return result;

  revalidatePath("/admin/events");
  return { success: true as const };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireMeeple } from "@/lib/members/meeples";
import {
  setHelperAvailability,
  clearHelperAvailability,
} from "@/lib/events/helper-availability";

export async function setOwnHelperAvailability(
  dayId: string,
  startsAt: Date,
  endsAt: Date,
  roleIds: string[],
) {
  const meeple = await requireMeeple();

  const result = await setHelperAvailability({
    meepleId: meeple.id,
    dayId,
    startsAt,
    endsAt,
    roleIds,
  });
  if ("success" in result) revalidatePath("/helfer");
  return result;
}

export async function clearOwnHelperAvailability(dayId: string) {
  const meeple = await requireMeeple();

  const result = await clearHelperAvailability(meeple.id, dayId);
  if ("success" in result) revalidatePath("/helfer");
  return result;
}

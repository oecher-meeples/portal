"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";

export type EventDayTimeInput = {
  startsAt: Date | null;
  endsAt: Date | null;
};

function validateEventDayTimeInput(input: EventDayTimeInput) {
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
    return "Das Ende muss nach dem Beginn liegen.";
  }
  return null;
}

/** Sets the opening time for one day of an event (#150) — separate from `Event`'s
 * own date range, which carries no time-of-day. */
export async function updateEventDayTimes(
  dayId: string,
  input: EventDayTimeInput,
) {
  await requirePermission("events:manage");

  const validationError = validateEventDayTimeInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const day = await prisma.eventDay.update({
    where: { id: dayId },
    data: { startsAt: input.startsAt, endsAt: input.endsAt },
  });

  revalidatePath(`/admin/events/${day.eventId}`);
  return { success: true as const };
}

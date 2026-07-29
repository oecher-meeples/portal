"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { uniqueSlug } from "@/lib/slug";

export type EventInput = {
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
};

async function uniqueEventSlug(title: string, excludeId?: string) {
  return uniqueSlug(title, async (slug) => {
    const existing = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });
    return existing !== null && existing.id !== excludeId;
  });
}

function validateEventInput(input: EventInput) {
  if (!input.title.trim()) {
    return "Bitte einen Titel angeben.";
  }
  if (!input.startsAt) {
    return "Bitte einen Start-Zeitpunkt angeben.";
  }
  if (input.endsAt && input.endsAt < input.startsAt) {
    return "Das Ende darf nicht vor dem Start liegen.";
  }
  return null;
}

export async function createEvent(input: EventInput) {
  await requirePermission("events:manage");

  const validationError = validateEventInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const title = input.title.trim();
  const slug = await uniqueEventSlug(title);

  const event = await prisma.event.create({
    data: {
      slug,
      title,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      location: input.location || null,
    },
  });

  revalidatePath("/admin/events");
  return { success: true as const, id: event.id, slug: event.slug };
}

export async function updateEvent(id: string, input: EventInput) {
  await requirePermission("events:manage");

  const validationError = validateEventInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const title = input.title.trim();
  const slug = await uniqueEventSlug(title, id);

  await prisma.event.update({
    where: { id },
    data: {
      slug,
      title,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      location: input.location || null,
    },
  });

  revalidatePath("/admin/events");
  return { success: true as const };
}

export async function deleteEvent(id: string) {
  await requirePermission("events:manage");

  const [shiftCount, shelfAssignmentCount, itemCount] = await Promise.all([
    prisma.shift.count({ where: { eventId: id } }),
    prisma.eventShelfAssignment.count({ where: { eventId: id } }),
    prisma.fleaMarketItem.count({ where: { eventId: id } }),
  ]);

  if (shiftCount > 0 || shelfAssignmentCount > 0 || itemCount > 0) {
    return {
      error:
        "Dieses Event hat noch Schichten, Regal-Zuordnungen oder Flohmarkt-Artikel — erst diese entfernen.",
    };
  }

  await prisma.event.delete({ where: { id } });

  revalidatePath("/admin/events");
  return { success: true as const };
}

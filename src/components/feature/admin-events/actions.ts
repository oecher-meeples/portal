"use server";

import { revalidatePath } from "next/cache";
import type { EventVisibility, HelperPhase } from "@prisma/client";
import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { uniqueSlug } from "@/lib/utils/slug";
import { HELPER_PHASE_ORDER } from "@/lib/events/helper-phase";
import { enumerateEventDates, endOfUtcDay } from "@/lib/events/event-days";

export type EventInput = {
  title: string;
  startsAt: Date;
  endsAt?: Date | null;
  location?: string | null;
  helperPhase?: HelperPhase;
  visibility?: EventVisibility;
};

/** Bring `EventDay` in sync with the (possibly changed) `startsAt`/`endsAt` range:
 * add rows for newly-added dates, drop rows for dates that fell out of range.
 * Existing days keep their already-set opening times. */
async function syncEventDays(eventId: string, input: EventInput) {
  const dates = enumerateEventDates(input.startsAt, input.endsAt ?? null);

  await prisma.eventDay.deleteMany({
    where: { eventId, date: { notIn: dates } },
  });
  await prisma.eventDay.createMany({
    data: dates.map((date) => ({ eventId, date })),
    skipDuplicates: true,
  });
}

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
  await requireActionPermission("events:manage");

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
      endsAt: input.endsAt ? endOfUtcDay(input.endsAt) : null,
      location: input.location || null,
      helperPhase: input.helperPhase ?? "PLANNING",
      visibility: input.visibility ?? "DRAFT",
    },
  });
  await syncEventDays(event.id, input);

  revalidatePath("/admin/events");
  return { success: true as const, id: event.id, slug: event.slug };
}

export async function updateEvent(id: string, input: EventInput) {
  await requireActionPermission("events:manage");

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
      endsAt: input.endsAt ? endOfUtcDay(input.endsAt) : null,
      location: input.location || null,
      // Nur setzen, wenn mitgegeben — sonst bliebe die Phase beim Bearbeiten
      // anderer Felder nicht erhalten (#676).
      ...(input.helperPhase ? { helperPhase: input.helperPhase } : {}),
      visibility: input.visibility ?? "DRAFT",
    },
  });
  await syncEventDays(id, input);

  revalidatePath("/admin/events");
  return { success: true as const };
}

export async function deleteEvent(id: string) {
  await requireActionPermission("events:manage");

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

/**
 * Setzt die Helfersichtbarkeit (#676) — geteilt vom Schalter "Schichten
 * anfragen" und der Stammdaten-Combobox, damit beide dasselbe Feld über
 * dieselbe Logik schreiben. Zurückschalten blendet Zuweisungen nur aus,
 * `confirmedAt` bleibt erhalten.
 */
export async function setEventHelperPhase(eventId: string, phase: HelperPhase) {
  await requireActionPermission("events:manage");

  if (!HELPER_PHASE_ORDER.includes(phase)) {
    return { error: "Ungültige Helfersichtbarkeit." };
  }

  await prisma.event.update({
    where: { id: eventId },
    data: { helperPhase: phase },
  });

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/helfer");
  return { success: true as const };
}

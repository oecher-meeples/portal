import { notFound } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";
import { requireAdminPermission } from "@/lib/auth/session";
import {
  EventDetailView,
  type ShiftRow,
} from "@/components/feature/admin-events/event-detail-view";
import type { EditableEventDay } from "@/components/feature/admin-events/event-day-time-form";
import type { PoolMeeple } from "@/components/feature/admin-events/helper-pool-bar";
import type { PlanBooking } from "@/lib/events/shift-plan-types";
import { effectiveShiftCapacity } from "@/lib/events/shift-capacity";
import { buildHelperOverview } from "@/lib/events/helper-overview";
import {
  helperDisplayName,
  helperKey,
  isGuest,
} from "@/lib/events/helper-identity";

type AvailabilityWithHelper = {
  meeple: { id: string; displayName: string } | null;
  guest: { id: string; name: string } | null;
};

/** Identität + Anzeigename eines Verfügbarkeits-Eintrags (Meeple oder Gast,
 * #698) — gemeinsame Grundlage für Pool und Helfer-Übersicht. */
function availabilityHelper(availability: AvailabilityWithHelper) {
  const ref = {
    meepleId: availability.meeple?.id,
    guestId: availability.guest?.id,
  };
  return {
    helperId: helperKey(ref),
    isGuest: isGuest(ref),
    displayName: helperDisplayName(
      ref,
      availability.meeple?.displayName ?? availability.guest?.name ?? "",
    ),
  };
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPermission("events:manage");
  const { id } = await params;

  const [event, shelves, helperRoles] = await Promise.all([
    prisma.event.findUnique({
      where: { id },
      include: {
        days: {
          orderBy: { date: "asc" },
          include: {
            availabilities: {
              select: {
                startsAt: true,
                endsAt: true,
                meeple: {
                  select: {
                    id: true,
                    displayName: true,
                    profilePictureUrl: true,
                    profilePictureVisibility: true,
                  },
                },
                guest: { select: { id: true, name: true } },
                comment: true,
                roles: { select: { roleId: true } },
              },
            },
          },
        },
        shifts: {
          orderBy: { targetStartsAt: "asc" },
          include: {
            role: { select: { id: true, name: true, hasShifts: true } },
            day: { select: { date: true } },
            bookings: {
              select: {
                id: true,
                confirmedAt: true,
                meepleId: true,
                guestId: true,
                startsAt: true,
                endsAt: true,
                slotIndex: true,
                meeple: { select: { displayName: true } },
                guest: { select: { name: true } },
              },
            },
          },
        },
        shelfAssignments: {
          include: { unit: { select: { id: true, label: true } } },
        },
      },
    }),
    prisma.storageUnit.findMany({
      where: { kind: "SHELF", retiredAt: null },
      orderBy: { label: "asc" },
      select: { id: true, label: true },
    }),
    prisma.helperRole.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!event) {
    notFound();
  }

  const days: EditableEventDay[] = event.days.map((day) => ({
    id: day.id,
    date: day.date.toISOString(),
    startsAt: day.startsAt?.toISOString() ?? null,
    endsAt: day.endsAt?.toISOString() ?? null,
  }));

  const shifts: ShiftRow[] = event.shifts.map((shift) => ({
    id: shift.id,
    dayId: shift.dayId,
    dayDate: shift.day.date.toISOString(),
    roleId: shift.role.id,
    roleName: shift.role.name,
    targetStartsAt: shift.targetStartsAt.toISOString(),
    targetEndsAt: shift.targetEndsAt.toISOString(),
    capacity: effectiveShiftCapacity(shift),
    bookings: shift.bookings,
  }));

  const bookingsByDay: Record<string, PlanBooking[]> = {};
  for (const shift of event.shifts) {
    const forDay = (bookingsByDay[shift.dayId] ??= []);
    const dayAvailabilities =
      event.days.find((day) => day.id === shift.dayId)?.availabilities ?? [];
    for (const booking of shift.bookings) {
      const key = helperKey(booking);
      const availability = dayAvailabilities.find(
        (entry) => availabilityHelper(entry).helperId === key,
      );
      forDay.push({
        id: booking.id,
        shiftId: shift.id,
        roleId: shift.roleId,
        dayId: shift.dayId,
        helperId: key,
        isGuest: isGuest(booking),
        isFiller: effectiveShiftCapacity(shift) === 0,
        displayName: helperDisplayName(
          booking,
          booking.meeple?.displayName ?? booking.guest?.name ?? "",
        ),
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
        confirmedAt: booking.confirmedAt?.toISOString() ?? null,
        slotIndex: booking.slotIndex,
        availabilityStartsAt: availability?.startsAt.toISOString() ?? null,
        availabilityEndsAt: availability?.endsAt.toISOString() ?? null,
      });
    }
  }

  /** Whoever has ≥1 assignment on a day gets the yellow "bereits verplant"
   * marker in the pool bar (#161), regardless of which role it's for.
   * Füller-Rollen (ohne Schichtplanung) zählen nicht als verplant. */
  const plannedMeepleIdsByDay: Record<string, Set<string>> = Object.fromEntries(
    Object.entries(bookingsByDay).map(([dayId, bookings]) => [
      dayId,
      new Set(bookings.filter((b) => !b.isFiller).map((b) => b.helperId)),
    ]),
  );

  const pool: Record<string, PoolMeeple[]> = Object.fromEntries(
    event.days.map((day) => [
      day.id,
      day.availabilities.flatMap((availability) =>
        availability.roles.map((role) => ({
          ...availabilityHelper(availability),
          roleId: role.roleId,
          alreadyPlanned:
            plannedMeepleIdsByDay[day.id]?.has(
              availabilityHelper(availability).helperId,
            ) ?? false,
          availabilityStartsAt: availability.startsAt.toISOString(),
          availabilityEndsAt: availability.endsAt.toISOString(),
          comment: availability.comment,
        })),
      ),
    ]),
  );

  const assignedShelfIds = new Set(
    event.shelfAssignments.map((assignment) => assignment.unit.id),
  );
  const assignedShelves = event.shelfAssignments.map((assignment) => ({
    id: assignment.unit.id,
    label: assignment.unit.label,
  }));
  const availableShelves = shelves.filter(
    (shelf) => !assignedShelfIds.has(shelf.id),
  );

  const helperOverview = buildHelperOverview(
    event.days.flatMap((day) =>
      day.availabilities.map((availability) => ({
        ...availabilityHelper(availability),
        profilePictureUrl: availability.meeple?.profilePictureUrl ?? null,
        profilePictureVisibility:
          availability.meeple?.profilePictureVisibility ?? "INTERN",
        dayDate: day.date.toISOString(),
        startsAt: availability.startsAt.toISOString(),
        endsAt: availability.endsAt.toISOString(),
        roleIds: availability.roles.map((role) => role.roleId),
      })),
    ),
    // Auch Zuweisungen ohne Schichtplanung (Füller, ganze Verfügbarkeit)
    // zählen als gebucht — die Person ist an dem Tag voll eingeplant.
    event.shifts.flatMap((shift) =>
      shift.bookings.map((booking) => ({
        helperId: helperKey(booking),
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      })),
    ),
    new Map(helperRoles.map((role) => [role.id, role.name])),
  );

  return (
    <EventDetailView
      eventId={event.id}
      eventTitle={event.title}
      eventStartsAt={event.startsAt.toISOString()}
      eventEndsAt={event.endsAt?.toISOString() ?? null}
      eventLocation={event.location}
      eventHelperPhase={event.helperPhase}
      eventVisibility={event.visibility}
      days={days}
      shifts={shifts}
      helperRoles={helperRoles}
      helperOverview={helperOverview}
      pool={pool}
      bookingsByDay={bookingsByDay}
      assignedShelves={assignedShelves}
      availableShelves={availableShelves}
    />
  );
}

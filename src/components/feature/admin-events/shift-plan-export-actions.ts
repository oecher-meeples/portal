"use server";

import { requireActionPermission } from "@/lib/auth/action-guards";
import { prisma } from "@/lib/utils/prisma";
import { escapeCsvField } from "@/lib/utils/csv";
import { helperDisplayName, helperKey } from "@/lib/events/helper-identity";
import { effectiveShiftCapacity } from "@/lib/events/shift-capacity";
import { buildExportDays } from "@/lib/events/shift-plan-export";
import { renderShiftPlanPdf } from "@/lib/events/shift-plan-pdf";
import { slugify } from "@/lib/utils/slug";
import { formatTimePlain } from "@/lib/utils/format";
import { SHIFT_PLAN_CSV_COLUMNS } from "@/components/feature/admin-events/shift-plan-csv-columns";

function csvCell(value: string) {
  return escapeCsvField(value, ";");
}

/** One row per booking of the given event day — Rolle/Von/Bis/Person/Status
 * (bestätigt/offen aus `confirmedAt`), sorted by role then start time so the
 * export reads like the grid, top to bottom (#296). */
export async function exportShiftPlanDayCsv(dayId: string) {
  await requireActionPermission("events:manage");

  const day = await prisma.eventDay.findUnique({
    where: { id: dayId },
    select: { date: true },
  });
  if (!day) return { error: "Tag wurde nicht gefunden." };

  const bookings = await prisma.shiftBooking.findMany({
    where: { shift: { dayId } },
    orderBy: [{ shift: { role: { name: "asc" } } }, { startsAt: "asc" }],
    select: {
      startsAt: true,
      endsAt: true,
      confirmedAt: true,
      meepleId: true,
      guestId: true,
      meeple: { select: { displayName: true } },
      guest: { select: { name: true } },
      shift: { select: { role: { select: { name: true } } } },
    },
  });

  const rows = bookings.map((booking) =>
    [
      booking.shift.role.name,
      formatTimePlain(booking.startsAt),
      formatTimePlain(booking.endsAt),
      helperDisplayName(
        booking,
        booking.meeple?.displayName ?? booking.guest?.name ?? "",
      ),
      booking.confirmedAt ? "bestätigt" : "offen",
    ]
      .map(csvCell)
      .join(";"),
  );

  return {
    success: true as const,
    filename: `schichtplan-${day.date.toISOString().slice(0, 10)}.csv`,
    csv: [SHIFT_PLAN_CSV_COLUMNS.join(";"), ...rows].join("\r\n"),
    rowCount: rows.length,
  };
}

/** Schichtplan des ganzen Events als PDF (#697) — Base64, damit es als
 * Server-Action-Ergebnis serialisierbar bleibt. Tage ohne Schichten entfallen. */
export async function exportShiftPlanPdf(eventId: string) {
  await requireActionPermission("events:manage");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      title: true,
      days: {
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
        },
      },
      shifts: {
        select: {
          dayId: true,
          roleId: true,
          capacity: true,
          targetStartsAt: true,
          targetEndsAt: true,
          role: { select: { name: true, hasShifts: true } },
          bookings: {
            select: {
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
    },
  });
  if (!event) return { error: "Event wurde nicht gefunden." };

  const exportDays = buildExportDays(
    event.days.map((day) => ({ id: day.id, date: day.date })),
    event.shifts.map((shift) => ({
      dayId: shift.dayId,
      roleId: shift.roleId,
      roleName: shift.role.name,
      capacity: effectiveShiftCapacity(shift),
      targetStartsAt: shift.targetStartsAt,
      targetEndsAt: shift.targetEndsAt,
    })),
    event.shifts.flatMap((shift) =>
      shift.bookings.map((booking) => ({
        dayId: shift.dayId,
        roleId: shift.roleId,
        helperId: helperKey(booking),
        name: helperDisplayName(
          booking,
          booking.meeple?.displayName ?? booking.guest?.name ?? "",
        ),
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        slotIndex: booking.slotIndex,
      })),
    ),
  );
  if (exportDays.length === 0) {
    return { error: "Es sind noch keine Schichten angelegt." };
  }

  const bytes = await renderShiftPlanPdf(exportDays);
  return {
    success: true as const,
    filename: `schichtplan-${slugify(event.title)}.pdf`,
    base64: Buffer.from(bytes).toString("base64"),
  };
}

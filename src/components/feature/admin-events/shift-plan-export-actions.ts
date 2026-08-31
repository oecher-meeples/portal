"use server";

import { prisma } from "@/lib/utils/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { escapeCsvField } from "@/lib/utils/csv";
import { formatTimePlain } from "@/lib/utils/format";
import { SHIFT_PLAN_CSV_COLUMNS } from "@/components/feature/admin-events/shift-plan-csv-columns";

function csvCell(value: string) {
  return escapeCsvField(value, ";");
}

/** One row per booking of the given event day — Rolle/Von/Bis/Person/Status
 * (bestätigt/offen aus `confirmedAt`), sorted by role then start time so the
 * export reads like the grid, top to bottom (#296). */
export async function exportShiftPlanDayCsv(dayId: string) {
  await requirePermission("events:manage");

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
      meeple: { select: { displayName: true } },
      shift: { select: { role: { select: { name: true } } } },
    },
  });

  const rows = bookings.map((booking) =>
    [
      booking.shift.role.name,
      formatTimePlain(booking.startsAt),
      formatTimePlain(booking.endsAt),
      booking.meeple.displayName,
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

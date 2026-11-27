import { prisma } from "@/lib/utils/prisma";
import { UserFacingError } from "@/lib/utils/action-result";
import {
  guestNameKey,
  normalizeWhitespace,
  type GuestImportRow,
} from "@/lib/events/guest-import-csv";

export type GuestImportResult = {
  /** Neu angelegte Gäste (wiederverwendete zählen nicht). */
  guestsCreated: number;
  /** Geschriebene (Gast, Tag)-Meldungen — Re-Import ersetzt bestehende. */
  availabilities: number;
};

/**
 * Schreibt die im Browser geparsten Gast-Zeilen (#698): Gast per `nameKey`
 * wiederverwenden bzw. anlegen, pro (Gast, Tag) die Verfügbarkeit samt Rollen
 * ersetzen. Prüft serverseitig, dass Tage zum Event und Rollen existieren —
 * dem Client wird nichts geglaubt. Does not check permissions.
 */
export async function commitGuestImport(
  eventId: string,
  rows: GuestImportRow[],
): Promise<GuestImportResult> {
  const [days, roles] = await Promise.all([
    prisma.eventDay.findMany({ where: { eventId }, select: { id: true } }),
    prisma.helperRole.findMany({ select: { id: true } }),
  ]);
  const dayIds = new Set(days.map((day) => day.id));
  const roleIds = new Set(roles.map((role) => role.id));
  for (const row of rows) {
    if (
      !dayIds.has(row.dayId) ||
      row.roleIds.some((id) => !roleIds.has(id)) ||
      new Date(row.endsAt) <= new Date(row.startsAt)
    ) {
      throw new UserFacingError("Ungültige Importdaten.");
    }
  }

  return prisma.$transaction(async (tx) => {
    const guestIds = new Map<string, string>();
    let guestsCreated = 0;
    for (const row of rows) {
      const nameKey = guestNameKey(row.name);
      let guestId = guestIds.get(nameKey);
      if (!guestId) {
        const existing = await tx.guest.findUnique({
          where: { nameKey },
          select: { id: true },
        });
        if (existing) {
          guestId = existing.id;
        } else {
          const created = await tx.guest.create({
            data: { name: normalizeWhitespace(row.name), nameKey },
            select: { id: true },
          });
          guestId = created.id;
          guestsCreated += 1;
        }
        guestIds.set(nameKey, guestId);
      }

      const startsAt = new Date(row.startsAt);
      const endsAt = new Date(row.endsAt);
      await tx.helperAvailability.upsert({
        where: { guestId_dayId: { guestId, dayId: row.dayId } },
        create: {
          guestId,
          dayId: row.dayId,
          startsAt,
          endsAt,
          roles: { create: row.roleIds.map((roleId) => ({ roleId })) },
        },
        update: {
          startsAt,
          endsAt,
          roles: {
            deleteMany: {},
            create: row.roleIds.map((roleId) => ({ roleId })),
          },
        },
      });
    }
    return { guestsCreated, availabilities: rows.length };
  });
}

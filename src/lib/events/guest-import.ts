import { prisma } from "@/lib/utils/prisma";
import { UserFacingError } from "@/lib/utils/action-result";
import {
  guestNameKey,
  roleNameKey,
  normalizeWhitespace,
  type GuestImportRow,
} from "@/lib/events/guest-import-csv";

export type GuestImportResult = {
  /** Neu angelegte Gäste (wiederverwendete zählen nicht). */
  guestsCreated: number;
  /** Neu angelegte Helferrollen. */
  rolesCreated: number;
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
    prisma.helperRole.findMany({ select: { id: true, name: true } }),
  ]);
  const dayIds = new Set(days.map((day) => day.id));
  const roleIds = new Set(roles.map((role) => role.id));
  const roleIdByKey = new Map(
    roles.map((role) => [roleNameKey(role.name), role.id]),
  );
  for (const row of rows) {
    if (
      !dayIds.has(row.dayId) ||
      row.roleIds.some((id) => !roleIds.has(id)) ||
      row.roleIds.length + row.newRoleNames.length === 0 ||
      new Date(row.endsAt) <= new Date(row.startsAt)
    ) {
      throw new UserFacingError("Ungültige Importdaten.");
    }
  }

  return prisma.$transaction(async (tx) => {
    // Neue Rollen einmalig anlegen (gleichnamige vorhandene werden genutzt).
    let rolesCreated = 0;
    for (const row of rows) {
      for (const name of row.newRoleNames) {
        const key = roleNameKey(name);
        if (roleIdByKey.has(key)) continue;
        const created = await tx.helperRole.create({
          data: { name: normalizeWhitespace(name) },
          select: { id: true },
        });
        roleIdByKey.set(key, created.id);
        rolesCreated += 1;
      }
    }
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

      const rowRoleIds = [
        ...new Set([
          ...row.roleIds,
          ...row.newRoleNames.map((name) =>
            roleIdByKey.get(roleNameKey(name))!,
          ),
        ]),
      ];
      const startsAt = new Date(row.startsAt);
      const endsAt = new Date(row.endsAt);
      await tx.helperAvailability.upsert({
        where: { guestId_dayId: { guestId, dayId: row.dayId } },
        create: {
          guestId,
          dayId: row.dayId,
          startsAt,
          endsAt,
          roles: { create: rowRoleIds.map((roleId) => ({ roleId })) },
        },
        update: {
          startsAt,
          endsAt,
          roles: {
            deleteMany: {},
            create: rowRoleIds.map((roleId) => ({ roleId })),
          },
        },
      });
    }
    return { guestsCreated, rolesCreated, availabilities: rows.length };
  });
}

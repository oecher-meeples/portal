import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Obergrenze der Postgres-`INTEGER`-Spalte `GameCopy.inventoryNumber`. */
const MAX_INVENTORY_NUMBER = 2_147_483_647;

export const INVALID_INVENTORY_NUMBER_ERROR =
  "Inventarnummer muss eine positive ganze Zahl sein.";

/**
 * Formular-/Import-Text → Inventarnummer (#543). Leer → `null` (keine
 * Nummer); alles, was keine reine Ziffernfolge ist, wird zu `NaN` und fällt
 * damit bei `validateInventoryNumber()` durch — die eigentliche Prüfung lebt
 * serverseitig an genau einer Stelle.
 */
export function parseInventoryNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}

export function isValidInventoryNumber(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= MAX_INVENTORY_NUMBER;
}

/**
 * Gültigkeits- und Eindeutigkeits-Prüfung beim Speichern (#270, #543) — der
 * DB-`@unique`-Constraint greift ohnehin, aber diese Prüfung liefert vorab
 * eine sprechende Fehlermeldung statt eines rohen Prisma-Fehlers.
 */
export async function validateInventoryNumber(
  tx: Tx,
  inventoryNumber: number,
  excludeGameCopyId?: string,
): Promise<string | null> {
  if (!isValidInventoryNumber(inventoryNumber)) {
    return INVALID_INVENTORY_NUMBER_ERROR;
  }

  const existing = await tx.gameCopy.findFirst({
    where: {
      inventoryNumber,
      ...(excludeGameCopyId ? { id: { not: excludeGameCopyId } } : {}),
    },
    select: { id: true },
  });

  return existing
    ? `Inventarnummer ${inventoryNumber} ist bereits vergeben.`
    : null;
}

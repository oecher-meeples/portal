import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Vorschlag für ein neues `GameCopy.inventoryNumber` (#270): höchste bereits
 * vergebene, rein numerische Nummer + 1. Bewusst **kein** Lücken-Auffüllen
 * wie `nextUnitCode()` (`inventory/codes.ts`) — die Inventarnummer ist
 * freier Text, der eine bestehende externe/physische Nummerierung fortsetzt,
 * kein systematisch lückenloses Schema. Nicht-numerische Bestandswerte
 * (z. B. eine ältere Freitext-Nummerierung) werden beim Vorschlag ignoriert.
 */
export function suggestNextInventoryNumber(
  existing: (string | null | undefined)[],
): string {
  const numbers = existing
    .map((value) =>
      value && /^\d+$/.test(value.trim()) ? Number(value) : null,
    )
    .filter((n): n is number => n !== null);

  if (numbers.length === 0) return "1";
  return String(Math.max(...numbers) + 1);
}

/**
 * Eindeutigkeits-Prüfung beim Speichern (#270) — der DB-`@unique`-Constraint
 * greift ohnehin, aber diese Prüfung liefert vorab eine sprechende
 * Fehlermeldung statt eines rohen Prisma-Constraint-Fehlers.
 */
export async function validateInventoryNumberUniqueness(
  tx: Tx,
  inventoryNumber: string,
  excludeGameCopyId?: string,
): Promise<string | null> {
  const trimmed = inventoryNumber.trim();
  if (!trimmed) return null;

  const existing = await tx.gameCopy.findFirst({
    where: {
      inventoryNumber: trimmed,
      ...(excludeGameCopyId ? { id: { not: excludeGameCopyId } } : {}),
    },
    select: { id: true },
  });

  return existing ? `Inventarnummer "${trimmed}" ist bereits vergeben.` : null;
}

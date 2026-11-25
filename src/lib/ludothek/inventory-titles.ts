import { prisma } from "@/lib/utils/prisma";
import { IN_INVENTORY_WHERE } from "@/lib/ludothek/board-game-stub";

/** Titel für Auswahllisten (z. B. Spielergesuch): nur Titel des Bestands, nie
 * reine Want-to-Play-Stubs (#637). */
export function listInventoryTitleOptions() {
  return prisma.boardGame.findMany({
    where: IN_INVENTORY_WHERE,
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
}

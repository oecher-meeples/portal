"use server";

import { revalidatePath } from "next/cache";
import type { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";
import { requirePermission } from "@/lib/auth/permissions";
import { updateBoardGameTraitText as updateBoardGameTraitTextRecord } from "@/lib/ludothek/board-game-trait-texts";

async function requireGamesManage() {
  return requirePermission("games:manage");
}

export async function updateBoardGameTraitText(
  trait: BoardGameTrait,
  input: {
    label: string;
    tooltip: string;
    tone: BoardGameTraitTone;
    loanMessage: string;
    detailsMessage: string;
  },
) {
  await requireGamesManage();

  await updateBoardGameTraitTextRecord(trait, {
    label: input.label.trim() || null,
    tooltip: input.tooltip.trim() || null,
    tone: input.tone,
    loanMessage: input.loanMessage.trim() || null,
    detailsMessage: input.detailsMessage.trim() || null,
  });

  // Jede Anzeige-Stelle im Ludothek-/Ausleihe-Bereich liest den Text live,
  // kein eigener Cache-Key nötig — revalidatePath genügt für die
  // server-gerenderten Seiten.
  revalidatePath("/ludothek");
  revalidatePath("/ausleihe");
  revalidatePath("/admin/spiel-traits");
  return { success: true as const };
}

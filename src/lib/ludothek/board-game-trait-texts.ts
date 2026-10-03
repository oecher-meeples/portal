import "server-only";
import { BoardGameTrait, BoardGameTraitTone } from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  BOARD_GAME_TRAIT_OPTIONS,
  type BoardGameTraitTextData,
} from "@/lib/ludothek/board-game-traits";

/** Alle 5 `BoardGameTraitText`-Zeilen, feste Reihenfolge (`BoardGameTrait`-
 * Enum-Deklaration) — für die Admin-Verwaltungsseite. Eine Zeile pro Trait
 * existiert immer (Seed, siehe `prisma/seed-board-game-traits.ts`), trotzdem
 * defensiv mit Fallback-Default für den Fall, dass eine Zeile fehlt (z. B.
 * eine Testdatenbank ohne Seed-Lauf). */
export async function listBoardGameTraitTexts(): Promise<
  BoardGameTraitTextData[]
> {
  const rows = await prisma.boardGameTraitText.findMany();
  const byTrait = new Map(rows.map((row) => [row.trait, row]));

  return BOARD_GAME_TRAIT_OPTIONS.map(
    (trait) =>
      byTrait.get(trait) ?? {
        trait,
        label: null,
        tooltip: null,
        tone: BoardGameTraitTone.INFO,
        loanMessage: null,
        detailsMessage: null,
      },
  );
}

/** Lädt alle Texte als einfaches Objekt (statt `Map` — serialisierbar als
 * Server-Component-Prop an Client-Komponenten), Grundlage für
 * `resolveBoardGameTraits()` an jeder Anzeige-Stelle (Detail-/Card-/List-View,
 * Ausleihe-Banner). */
export async function loadBoardGameTraitTextsByTrait(): Promise<
  Partial<Record<BoardGameTrait, BoardGameTraitTextData>>
> {
  const rows = await listBoardGameTraitTexts();
  return Object.fromEntries(rows.map((row) => [row.trait, row]));
}

export type UpdateBoardGameTraitTextInput = {
  label: string | null;
  tooltip: string | null;
  tone: BoardGameTraitTone;
  loanMessage: string | null;
  detailsMessage: string | null;
};

/** Upsert statt reinem Update — eine fehlende Zeile (siehe Fallback oben)
 * darf beim ersten Speichern trotzdem angelegt werden. */
export async function updateBoardGameTraitText(
  trait: BoardGameTrait,
  input: UpdateBoardGameTraitTextInput,
) {
  await prisma.boardGameTraitText.upsert({
    where: { trait },
    update: input,
    create: { trait, ...input },
  });
  return { success: true as const };
}

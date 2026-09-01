import {
  BoardGameKind,
  type LanguageDependence,
  type Prisma,
  type PrismaClient,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import { uniqueSlug } from "@/lib/utils/slug";

type Tx = PrismaClient | Prisma.TransactionClient;

/**
 * Reine Titel-Lookup-/Anlage-Logik, bewusst ohne Import aus
 * `@/lib/members/meeples` (dessen `server-only`-Guard sonst transitiv jeden
 * Aufrufer mitreißt — auch `prisma/seed.ts`, das per `tsx` außerhalb der
 * `react-server`-Node-Condition läuft, siehe #241). `board-games.ts`
 * re-exportiert diese Funktionen für App-Code unverändert.
 */
export type BoardGameTitleInput = {
  title: string;
  /** Zweiter Titel neben `title` — z. B. eine deutsche Übersetzung neben
   * einem englischen Haupttitel (#203). */
  secondaryTitle?: string | null;
  bggId?: number | null;
  ean?: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playTimeMinutes?: number | null;
  weight?: number | null;
  /** BGGs Community-Durchschnittsbewertung (0–10), analog `weight` beim
   * BGG-Import/-Abgleich übernommen (#214). */
  averageRating?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  mechanics?: string[];
  explainerVideoUrl?: string | null;
  /** Manual override until the BGG import (blocked by #12) can set this reliably — see #30. */
  kind?: BoardGameKind;
  /** BGGs Language-Dependence-Poll-Level, als Vorschlag beim BGG-Import
   * übernommen, vom Admin frei änderbar (#188). */
  languageDependence?: LanguageDependence | null;
  /** Verlag(e) — mehrere möglich (Co-Publisher). Auto übernommen bei
   * identischem Wert über alle (ggf. deutschen) BGG-Versionen, sonst wählt
   * der Admin (#205, siehe `resolvePublisherFromVersions()`). */
  publisher?: string[];
  /** Autor(en)/Designer, direkt aus BGGs `boardgamedesigner`-Links (#205). */
  author?: string[];
  /** Erstveröffentlichungsjahr — ältestes Jahr über alle BGG-Versionen (#205). */
  yearPublished?: number | null;
};

export function toBoardGameTitleData(input: BoardGameTitleInput) {
  return {
    secondaryTitle: input.secondaryTitle || null,
    bggId: input.bggId ?? null,
    ean: input.ean ? normaliseEan(input.ean) : null,
    minPlayers: input.minPlayers ?? null,
    maxPlayers: input.maxPlayers ?? null,
    playTimeMinutes: input.playTimeMinutes ?? null,
    weight: input.weight ?? null,
    averageRating: input.averageRating ?? null,
    imageUrl: input.imageUrl || null,
    description: input.description || null,
    mechanics: input.mechanics ?? [],
    explainerVideoUrl: input.explainerVideoUrl || null,
    languageDependence: input.languageDependence ?? null,
    publisher: input.publisher ?? [],
    author: input.author ?? [],
    yearPublished: input.yearPublished ?? null,
    ...(input.kind ? { kind: input.kind } : {}),
  };
}

/** `invalidEan: true` markiert speziell den EAN-Fall — der Aufrufer bietet
 * dafür ein Recovery-Popup ("EAN löschen und speichern") statt eines reinen
 * Blockier-Fehlers an (#322). */
export function validateBoardGameTitleInput(
  input: BoardGameTitleInput,
): { message: string; invalidEan?: true } | null {
  if (!input.title) {
    return { message: "Bitte einen Titel angeben." };
  }
  if (input.ean && !isValidEan(input.ean)) {
    return {
      message: "Diese EAN ist ungültig. Bitte die Prüfziffer kontrollieren.",
      invalidEan: true,
    };
  }
  return null;
}

export async function uniqueBoardGameSlug(tx: Tx, title: string) {
  return uniqueSlug(
    title,
    async (slug) =>
      (await tx.boardGame.findFirst({
        where: { slug },
        select: { id: true },
      })) !== null,
  );
}

/** Finds the title by `bggId` (the one reliable product identity) or creates it. */
export async function findOrCreateBoardGameTitle(
  input: BoardGameTitleInput,
  tx: Tx = prisma,
) {
  if (input.bggId) {
    const existing = await tx.boardGame.findUnique({
      where: { bggId: input.bggId },
    });
    if (existing) return existing;
  }

  const slug = await uniqueBoardGameSlug(tx, input.title);
  return tx.boardGame.create({
    data: { title: input.title, slug, ...toBoardGameTitleData(input) },
  });
}

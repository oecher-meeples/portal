import {
  BoardGameKind,
  type BoardGameTrait,
  type LanguageDependence,
} from "@prisma/client";
import { prisma } from "@/lib/utils/prisma";
import {
  addBoardGameEans,
  normaliseAndValidateEans,
} from "@/lib/ludothek/board-game-eans";
import { uniqueSlug } from "@/lib/utils/slug";
import { isCatalogStub } from "@/lib/ludothek/board-game-stub";
import {
  type ContributorInput,
  linkContributors,
  replaceAuthorIllustratorLinksByName,
} from "@/lib/ludothek/taxonomy/contributors";
import {
  linkTags,
  replaceTitleTagsByLabel,
  type TagInput,
} from "@/lib/ludothek/taxonomy/tags";
import type { VersionInput } from "@/lib/ludothek/taxonomy/versions";

import type { DbClient } from "@/lib/utils/prisma";

type Tx = DbClient;

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
  /** Alle EANs des Titels (eine je Edition), global eindeutig (#668). */
  eans?: string[];
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playTimeMinutes?: number | null;
  weight?: number | null;
  /** BGGs Community-Durchschnittsbewertung (0–10), analog `weight` beim
   * BGG-Import/-Abgleich übernommen (#214). */
  averageRating?: number | null;
  imageUrl?: string | null;
  description?: string | null;
  /** Anzeigenamen der Mechaniken/Kategorien — ohne `tags` (BGG-Links) über
   * `replaceTitleTagsByLabel()` als `BoardGameTag` gespeichert, keine Spalte. */
  mechanics?: string[];
  categories?: string[];
  explainerVideoUrl?: string | null;
  /** Manual override until the BGG import (blocked by #12) can set this reliably — see #30. */
  kind?: BoardGameKind;
  /** BGGs Language-Dependence-Poll-Level, als Vorschlag beim BGG-Import
   * übernommen, vom Admin frei änderbar (#188). */
  languageDependence?: LanguageDependence | null;
  /** Edition (BGG-Version) des ersten Exemplars samt Verlagen — Auto
   * übernommen, wenn eindeutig, sonst wählt der Admin (#205, siehe
   * `resolveVersionInput()`). Wird an der Edition gespeichert, nicht am Titel. */
  version?: VersionInput;
  /** Autor(en)/Designer, direkt aus BGGs `boardgamedesigner`-Links (#205).
   * Nur über `BoardGameContributor` gespeichert, keine eigene Spalte. */
  author?: string[];
  /** Illustrator(en) (Epic #490) — analog `publisher`/`author`, nur über
   * `BoardGameContributor` gespeichert, keine eigene Spalte. */
  illustrator?: string[];
  /** Erstveröffentlichungsjahr — ältestes Jahr über alle BGG-Versionen (#205). */
  yearPublished?: number | null;
  /** BGGs Family-Signale mit Verleih-Auswirkung, als Vorschlag beim BGG-
   * Import übernommen, vom Admin frei änderbar (#487-Konzept). */
  traits?: BoardGameTrait[];
  /** Freier Admin-Hinweis je Titel — nie aus BGG befüllt (#487-Konzept). */
  notes?: string | null;
  /** Mitwirkende mit BGG-ID (Epic #490) — werden zusätzlich zu den
   * Namenslisten `publisher`/`author`/`illustrator` als Relation gespeichert. */
  contributors?: ContributorInput[];
  /** Mechaniken/Kategorien mit BGG-ID (Epic #490 Strang B) — haben beim
   * Anlegen Vorrang vor den Namenslisten `mechanics`/`categories`. */
  tags?: TagInput[];
};

/** `author`/`illustrator`/`mechanics`/`categories`/`version` sind bewusst nicht Teil dieses
 * Rückgabewerts — sie sind keine `BoardGame`-Spalten, sondern werden separat
 * über `replaceAuthorIllustratorLinksByName()`/`linkContributors()`,
 * `linkTags()`/`replaceTitleTagsByLabel()` bzw. `upsertBoardGameVersion()`
 * gespeichert. */
export function toBoardGameTitleData(input: BoardGameTitleInput) {
  return {
    secondaryTitle: input.secondaryTitle || null,
    bggId: input.bggId ?? null,
    minPlayers: input.minPlayers ?? null,
    maxPlayers: input.maxPlayers ?? null,
    playTimeMinutes: input.playTimeMinutes ?? null,
    weight: input.weight ?? null,
    averageRating: input.averageRating ?? null,
    imageUrl: input.imageUrl || null,
    description: input.description || null,
    explainerVideoUrl: input.explainerVideoUrl || null,
    languageDependence: input.languageDependence ?? null,
    yearPublished: input.yearPublished ?? null,
    traits: input.traits ?? [],
    notes: input.notes || null,
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
  if (normaliseAndValidateEans(input.eans).invalid.length > 0) {
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

/** Mitwirkende und Tags eines frisch angelegten bzw. aufgewerteten Titels:
 * BGG-IDs haben Vorrang, sonst die reinen Namenslisten. */
async function linkTitleRelations(
  tx: Tx,
  boardGameId: string,
  input: BoardGameTitleInput,
) {
  if (input.contributors?.length) {
    await linkContributors(tx, boardGameId, input.contributors);
  } else {
    await replaceAuthorIllustratorLinksByName(tx, boardGameId, {
      author: input.author ?? [],
      illustrator: input.illustrator ?? [],
    });
  }
  if (input.tags?.length) {
    await linkTags(tx, boardGameId, input.tags);
  } else {
    await replaceTitleTagsByLabel(tx, boardGameId, {
      mechanics: input.mechanics ?? [],
      categories: input.categories ?? [],
    });
  }
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
    if (existing) {
      // Ein Stub (#637) wird aufgewertet, sobald der Aufrufer vollständige
      // Daten liefert; ein bereits vollständiger Titel bleibt unverändert.
      const upgrade = isCatalogStub(existing) && !isCatalogStub(input);
      // Ein vollständiger Titel bekommt nur fehlende Anzeigefelder ergänzt
      // (z. B. das Bild, das ein früherer Fallback-Import nicht kannte).
      const gaps = {
        ...(!existing.imageUrl && input.imageUrl
          ? { imageUrl: input.imageUrl }
          : {}),
        ...(existing.yearPublished == null && input.yearPublished != null
          ? { yearPublished: input.yearPublished }
          : {}),
        ...(existing.averageRating == null && input.averageRating != null
          ? { averageRating: input.averageRating }
          : {}),
      };
      const title = upgrade
        ? await tx.boardGame.update({
            where: { id: existing.id },
            data: { title: input.title, ...toBoardGameTitleData(input) },
          })
        : Object.keys(gaps).length > 0
          ? await tx.boardGame.update({
              where: { id: existing.id },
              data: gaps,
            })
          : existing;
      await addBoardGameEans(
        tx,
        existing.id,
        normaliseAndValidateEans(input.eans).eans,
      );
      if (upgrade) {
        await linkTitleRelations(tx, existing.id, input);
      } else {
        await linkContributors(tx, existing.id, input.contributors ?? []);
        await linkTags(tx, existing.id, input.tags ?? []);
      }
      return title;
    }
  }

  const slug = await uniqueBoardGameSlug(tx, input.title);
  const created = await tx.boardGame.create({
    data: { title: input.title, slug, ...toBoardGameTitleData(input) },
  });
  await addBoardGameEans(
    tx,
    created.id,
    normaliseAndValidateEans(input.eans).eans,
  );
  await linkTitleRelations(tx, created.id, input);
  return created;
}

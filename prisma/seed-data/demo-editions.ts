import { HoldingOrigin } from "@prisma/client";
import { prisma } from "../../src/lib/utils/prisma";
import { slugify } from "../../src/lib/utils/slug";
import { upsertBoardGameVersion } from "../../src/lib/ludothek/taxonomy/versions";
import type { DemoGame } from "./demo-games";

/** Demo-Titel mit englischer Edition — zeigt die Flagge an Karte und
 * Detailseite. Alle anderen Demo-Editionen sind deutsch (keine Flagge). */
const DEMO_ENGLISH_EDITION_TITLES = ["Pandemic"];

/** Legt die Edition der Demo-Exemplare an: der Demo-Verlag aus den
 * Mitwirkenden, deutsch bzw. englisch. `null` ohne Verlag und ohne
 * englische Edition — das Exemplar bleibt dann ohne Edition. */
export async function seedDemoEdition(boardGameId: string, game: DemoGame) {
  const publishers = game.contributors.filter((c) => c.role === "PUBLISHER");
  const english = DEMO_ENGLISH_EDITION_TITLES.includes(game.title);
  if (publishers.length === 0 && !english) return null;

  return upsertBoardGameVersion(prisma, boardGameId, {
    languages: [english ? "English" : "German"],
    publishers,
  });
}

/** Ein Demo-Exemplar samt Anfangs-Standort — optional mit Edition. */
export async function createDemoGameCopy(
  boardGameId: string,
  title: string,
  unitId: string,
  adminMeepleId: string,
  usedSlugs: Set<string>,
  versionId: string | null,
) {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(slug);

  const copy = await prisma.gameCopy.create({
    data: { slug, boardGameId, versionId },
  });

  await prisma.gameHolding.create({
    data: {
      gameCopyId: copy.id,
      unitId,
      origin: HoldingOrigin.INITIAL,
      confirmedAt: new Date(),
      recordedByMeepleId: adminMeepleId,
    },
  });

  return copy;
}

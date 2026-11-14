import type { Prisma, PrismaClient } from "@prisma/client";
import { upsertContributor } from "@/lib/ludothek/taxonomy/contributors";
import { normalizeTaxonomyName } from "@/lib/ludothek/taxonomy/normalize";

type Tx = PrismaClient | Prisma.TransactionClient;

/** Eine Edition (BGG-Version) mit ihren Verlagen — Eingabe für
 * `upsertBoardGameVersion()`. `bggVersionId: null` = manuell angelegt. */
export type VersionInput = {
  bggVersionId?: number | null;
  name?: string | null;
  yearPublished?: number | null;
  productCode?: string | null;
  /** BGG-Sprachnamen, z. B. `["German"]`. */
  languages: string[];
  publishers: { bggId: number | null; name: string }[];
};

async function resolvePublisherIds(
  tx: Tx,
  publishers: VersionInput["publishers"],
): Promise<string[]> {
  const ids = new Set<string>();
  for (const publisher of publishers) {
    // Ein bereits bekannter Mitwirkender mit gleichem Namen wird
    // wiederverwendet (bevorzugt der mit BGG-ID) — wie bei Autoren/Illustratoren.
    const existing =
      publisher.bggId === null
        ? await tx.contributor.findFirst({
            where: { normalizedName: normalizeTaxonomyName(publisher.name) },
            orderBy: { bggId: "asc" },
          })
        : null;
    const contributor =
      existing ??
      (await upsertContributor(tx, {
        role: "PUBLISHER",
        bggId: publisher.bggId,
        name: publisher.name,
      }));
    ids.add(contributor.id);
  }
  return [...ids];
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

/**
 * Findet oder legt die Edition eines Titels an. Mit `bggVersionId` ist die
 * Edition über `(boardGameId, bggVersionId)` eindeutig und wird aktualisiert;
 * ohne (manuelle Edition) wird eine bereits identische (Name, Sprachen,
 * Verlage) wiederverwendet, damit mehrere Exemplare dieselbe Edition teilen.
 */
export async function upsertBoardGameVersion(
  tx: Tx,
  boardGameId: string,
  input: VersionInput,
) {
  const publisherIds = await resolvePublisherIds(tx, input.publishers);
  const data = {
    name: input.name?.trim() || null,
    yearPublished: input.yearPublished ?? null,
    productCode: input.productCode?.trim() || null,
    languages: input.languages,
  };

  let version: { id: string } | null = null;
  if (input.bggVersionId != null) {
    version = await tx.boardGameVersion.findUnique({
      where: {
        boardGameId_bggVersionId: {
          boardGameId,
          bggVersionId: input.bggVersionId,
        },
      },
      select: { id: true },
    });
    if (version) {
      await tx.boardGameVersion.update({ where: { id: version.id }, data });
    }
  } else {
    const candidates = await tx.boardGameVersion.findMany({
      where: { boardGameId, bggVersionId: null, name: data.name },
      select: {
        id: true,
        languages: true,
        publishers: { select: { contributorId: true } },
      },
    });
    const match = candidates.find(
      (candidate) =>
        sameSet(candidate.languages, data.languages) &&
        sameSet(
          candidate.publishers.map((p) => p.contributorId),
          publisherIds,
        ),
    );
    version = match ? { id: match.id } : null;
  }

  if (!version) {
    version = await tx.boardGameVersion.create({
      data: { boardGameId, bggVersionId: input.bggVersionId ?? null, ...data },
      select: { id: true },
    });
  }

  await tx.boardGameVersionPublisher.deleteMany({
    where: { versionId: version.id },
  });
  if (publisherIds.length > 0) {
    await tx.boardGameVersionPublisher.createMany({
      data: publisherIds.map((contributorId) => ({
        versionId: version.id,
        contributorId,
      })),
    });
  }

  return version;
}

/** Wahl der Edition für ein Exemplar: eine bereits am Titel vorhandene
 * (`versionId`) oder eine neue/übernommene (`version`). */
export type EditionSelection =
  { versionId: string } | { version: VersionInput };

/**
 * Löst eine `EditionSelection` zur Versions-ID auf (legt eine neue Edition an,
 * falls nötig). `undefined` → unverändert lassen, `null` → keine Edition.
 */
export async function resolveEditionId(
  tx: Tx,
  boardGameId: string,
  selection: EditionSelection | null | undefined,
): Promise<string | null | undefined> {
  if (selection === undefined) return undefined;
  if (selection === null) return null;

  if ("versionId" in selection) {
    const existing = await tx.boardGameVersion.findFirst({
      where: { id: selection.versionId, boardGameId },
      select: { id: true },
    });
    if (!existing) throw new Error("Edition gehört nicht zu diesem Titel.");
    return existing.id;
  }
  return (await upsertBoardGameVersion(tx, boardGameId, selection.version)).id;
}

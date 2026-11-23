import {
  normalizeTaxonomyName,
  taxonomyDedupKey,
} from "@/lib/ludothek/taxonomy/normalize";

/** Die Prisma-Operationen eines Registers (Mitwirkende, Tags), auf die die
 * gemeinsame Upsert-Regel zugreift. */
export type TaxonomyUpsertOps<T> = {
  findByDedupKey: (dedupKey: string) => Promise<T | null>;
  /** Optional: ein Eintrag ohne BGG-ID trifft einen vorhandenen gleichen
   * Namens (bevorzugt den mit BGG-ID), statt ein namensbasiertes Doppel
   * anzulegen. */
  findByNormalizedName?: (normalizedName: string) => Promise<T | null>;
  attachBggId: (
    id: string,
    data: { bggId: number; dedupKey: string; name: string },
  ) => Promise<T>;
  create: (data: {
    dedupKey: string;
    name: string;
    normalizedName: string;
    bggId: number | null;
  }) => Promise<T>;
};

/**
 * Findet oder legt einen Register-Eintrag an. Ein Eintrag mit BGG-ID wird
 * über `bggId` gefunden. Ein bisher namensbasierter Eintrag (ohne BGG-ID) mit
 * gleichem Namen bekommt die BGG-ID nachträglich und wird dabei umgeschrieben.
 * `prefix` trennt Register, deren BGG-IDs nur je Typ eindeutig sind (Tags).
 */
export async function upsertTaxonomyEntry<T extends { id: string }>(
  ops: TaxonomyUpsertOps<T>,
  input: { bggId: number | null; name: string; prefix?: string },
): Promise<T> {
  const normalizedName = normalizeTaxonomyName(input.name);
  const dedupKey = taxonomyDedupKey(input.bggId, normalizedName, input.prefix);

  const byKey = await ops.findByDedupKey(dedupKey);
  if (byKey) return byKey;

  if (input.bggId === null && ops.findByNormalizedName) {
    const byName = await ops.findByNormalizedName(normalizedName);
    if (byName) return byName;
  }

  if (input.bggId !== null) {
    const byName = await ops.findByDedupKey(
      taxonomyDedupKey(null, normalizedName, input.prefix),
    );
    if (byName) {
      return ops.attachBggId(byName.id, {
        bggId: input.bggId,
        dedupKey,
        name: input.name,
      });
    }
  }

  return ops.create({
    dedupKey,
    name: input.name,
    normalizedName,
    bggId: input.bggId,
  });
}

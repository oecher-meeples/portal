import { prisma } from "../src/lib/utils/prisma";
import { upsertTag } from "../src/lib/ludothek/taxonomy/tags";
import { TAG_DISPLAY_NAMES } from "./seed-data/tag-display-names";

/**
 * Legt die Tags mit deutschem Anzeigenamen vorab an (Epic #490 Strang B).
 * `upsertTag` trifft über Typ + normalisierten Namen auch einen bereits per
 * BGG-ID importierten Tag statt ein namensbasiertes Doppel anzulegen; die
 * BGG-ID setzt sonst später der Import. `displayName` wird nur gesetzt, solange er
 * leer ist — eine Admin-Änderung bleibt bei erneutem Seed erhalten.
 */
export async function seedTagDisplayNames() {
  for (const { type, name, displayName } of TAG_DISPLAY_NAMES) {
    const tag = await upsertTag(prisma, { type, bggId: null, name });
    if (tag.displayName === null) {
      await prisma.tag.update({
        where: { id: tag.id },
        data: { displayName },
      });
    }
  }
  console.log(`${TAG_DISPLAY_NAMES.length} Tag-Anzeigenamen angelegt/geprüft.`);
}

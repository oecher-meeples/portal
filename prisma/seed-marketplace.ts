import { prisma } from "../src/lib/utils/prisma";
import { DEMO_MARKET_LISTINGS } from "./seed-data/demo-marketplace";

/** Upsertet auf die (in `demo-marketplace.ts` fest vergebene) `id`, damit
 * ein Re-Seed die Demo-Anzeigen nicht dupliziert — `MarketListing` hat sonst
 * kein natürliches Unique-Feld. */
export async function seedDemoMarketListings(
  meepleIdByKey: Map<string, string>,
) {
  let created = 0;

  for (const listing of DEMO_MARKET_LISTINGS) {
    const sellerMeepleId = meepleIdByKey.get(listing.sellerKey);
    if (!sellerMeepleId) {
      console.warn(
        `Überspringe Marktplatz-Anzeige "${listing.title}": Verkäufer-Meeple "${listing.sellerKey}" nicht gefunden.`,
      );
      continue;
    }

    const data = {
      title: listing.title,
      description: listing.description,
      priceEuros: listing.priceEuros,
      condition: listing.condition,
      sellerMeepleId,
    };

    const existing = await prisma.marketListing.findUnique({
      where: { id: listing.id },
    });
    if (existing) {
      await prisma.marketListing.update({
        where: { id: listing.id },
        data,
      });
    } else {
      await prisma.marketListing.create({
        data: { id: listing.id, ...data },
      });
      created += 1;
    }
  }

  console.log(
    `${created} Demo-Marktplatz-Anzeigen angelegt, ${DEMO_MARKET_LISTINGS.length - created} bereits vorhanden aktualisiert.`,
  );
}

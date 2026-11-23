import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { signedBlobUrl, signedBlobUrlOrNull } from "@/lib/utils/blob-access";

/**
 * Private Dateien (#112): In der Datenbank steht nur der Objekt-Key
 * (`…Key`-Spalten), gelesen wird über berechnete Felder mit den alten Namen,
 * die eine kurzlebige signierte URL liefern. So bleibt jede Lesestelle
 * (`select: { profilePictureUrl: true }`, auch tief verschachtelt) wie sie
 * war, und keine kann versehentlich den rohen Key ausliefern. Geschrieben
 * wird immer das `…Key`-Feld.
 */
function withSignedBlobUrls(client: PrismaClient) {
  return client.$extends({
    name: "signed-blob-urls",
    result: {
      meeple: {
        profilePictureUrl: {
          needs: { profilePictureKey: true },
          compute: (meeple) => signedBlobUrlOrNull(meeple.profilePictureKey),
        },
      },
      lfgAttachment: {
        url: {
          needs: { key: true },
          compute: (attachment) => signedBlobUrl(attachment.key),
        },
      },
      marketListing: {
        imageUrls: {
          needs: { imageKeys: true },
          compute: (listing) => listing.imageKeys.map((k) => signedBlobUrl(k)),
        },
      },
      download: {
        fileUrl: {
          needs: { fileKey: true },
          compute: (download) => signedBlobUrl(download.fileKey),
        },
      },
      importantLink: {
        iconUrl: {
          needs: { iconKey: true },
          compute: (link) => signedBlobUrlOrNull(link.iconKey),
        },
      },
    },
  });
}

type AppPrismaClient = ReturnType<typeof withSignedBlobUrls>;

/** Der erweiterte Client oder ein Transaktions-Client daraus — Ersatz für
 * `PrismaClient | Prisma.TransactionClient` in Funktionen, die beides
 * annehmen (`tx: DbClient = prisma`). Die ausgelassenen Methoden sind
 * Prismas ITX-Deny-List. */
export type DbClient = Omit<
  AppPrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

// Prisma 7 has no Rust query engine anymore: PrismaClient refuses to start
// without a driver adapter (the URL in prisma.config.ts is only for
// Migrate/Studio). `@prisma/adapter-pg` is the plain TCP Postgres driver
// (node-postgres), so any standard `postgresql://` DATABASE_URL works —
// e.g. the self-hosted postgres:16 container from docker-compose.yml.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ?? withSignedBlobUrls(new PrismaClient({ adapter }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

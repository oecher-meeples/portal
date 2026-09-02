import { prisma } from "@/lib/utils/prisma";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";

const DIGEST_WINDOW_MS = 24 * 60 * 60 * 1000;

function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "";
}

function digestEmailHtml(
  listings: { id: string; title: string; priceEuros: number }[],
): string {
  const items = listings
    .map(
      (listing) =>
        `<li><a href="${siteUrl()}/markt/${listing.id}">${listing.title}</a> – ${listing.priceEuros} €</li>`,
    )
    .join("\n");
  return [
    "<h1>Neue Angebote im Marktplatz</h1>",
    `<ul>${items}</ul>`,
    `<p><a href="${siteUrl()}/profil">Newsletter-Einstellungen verwalten</a></p>`,
  ].join("\n");
}

/**
 * Täglicher Digest über neu angelegte `MarketListing`s (#254) — kein
 * Kategorie-/Suchbegriff-Filter, ein einfaches An/Aus-Abo
 * (`Meeple.marketNewsletterOptIn`). Bei 0 neuen Angeboten wird nicht
 * versendet (keine Leer-Mail).
 *
 * Der Cron läuft laut `vercel.json` genau einmal täglich, daher genügt ein
 * festes 24h-Fenster als "seit dem letzten Versand" — kein zusätzlicher
 * persistierter Zeitstempel nötig.
 */
export async function sendMarketDigest(): Promise<{
  newListings: number;
  recipients: number;
  succeeded: number;
  failed: number;
}> {
  const since = new Date(Date.now() - DIGEST_WINDOW_MS);

  const newListings = await prisma.marketListing.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, priceEuros: true },
  });

  if (newListings.length === 0) {
    return { newListings: 0, recipients: 0, succeeded: 0, failed: 0 };
  }

  // Die E-Mail-Adresse lebt seit #328 auf dem verknüpften Vereinsmitglied.
  const recipients = await prisma.meeple.findMany({
    where: { marketNewsletterOptIn: true, member: { isNot: null } },
    select: { member: { select: { email: true } } },
  });

  const html = digestEmailHtml(newListings);
  let succeeded = 0;
  let failed = 0;
  for (const recipient of recipients) {
    if (!recipient.member?.email) continue;
    try {
      await sendTransactionalEmail({
        to: recipient.member.email,
        subject: "Neue Angebote im Marktplatz",
        html,
      });
      succeeded++;
    } catch {
      failed++;
    }
  }

  return {
    newListings: newListings.length,
    recipients: recipients.length,
    succeeded,
    failed,
  };
}

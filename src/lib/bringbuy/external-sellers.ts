"use server";

import { prisma } from "@/lib/utils/prisma";
import { generateToken } from "@/lib/utils/generate-token";
import { sendTransactionalEmail } from "@/lib/newsletter/mailer";
import { isFleaMarketExternalSellerTokenValid } from "@/lib/bringbuy/status";
import { isBringAndBuyMarketOpen } from "@/lib/events/upcoming";

function siteUrl(): string {
  return process.env.PUBLIC_SITE_URL ?? "";
}

export type ExternalSellerRegistrationInput = {
  eventId: string;
  name: string;
  handle: string;
  email: string;
};

/**
 * Self-Service-Anmeldung für externe, nicht als Meeple angemeldete
 * Verkäufer:innen (#266) — ausschließlich für diese Zielgruppe, Vereins-
 * mitglieder nutzen stattdessen ihre bestehende Anmeldung ohne Token. Legt
 * einen `FleaMarketExternalSeller` an und verschickt den persönlichen Link
 * per E-Mail statt ihn direkt zurückzugeben (der Link identifiziert
 * vollständig, daher nicht im Klartext an den Client).
 */
export async function registerExternalSeller(
  input: ExternalSellerRegistrationInput,
) {
  const name = input.name.trim();
  const handle = input.handle.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || !handle || !email) {
    return { error: "Bitte Name, Kürzel und E-Mail-Adresse angeben." };
  }

  const event = await prisma.event.findUnique({
    where: { id: input.eventId },
  });
  if (!event || !isBringAndBuyMarketOpen(event)) {
    return { error: "Für dieses Event ist aktuell kein Bring & Buy offen." };
  }

  const token = generateToken();
  await prisma.fleaMarketExternalSeller.create({
    data: { eventId: input.eventId, name, handle, email, token },
  });

  const sellerUrl = `${siteUrl()}/bringbuy/verkaeufer/${token}`;
  await sendTransactionalEmail({
    to: email,
    subject: "Dein Bring & Buy-Verkäuferlink",
    html: [
      `<p>Hallo ${name},</p>`,
      `<p>hier ist dein persönlicher Link, um Spiele für den Bring & Buy-Markt „${event.title}“ anzumelden:</p>`,
      `<p><a href="${sellerUrl}">${sellerUrl}</a></p>`,
    ].join("\n"),
  });

  return { success: true as const };
}

export type ExternalSellerContext = {
  id: string;
  eventId: string;
  name: string;
};

/** Löst einen Verkäufer-Token auf — `null` bei unbekanntem oder nicht mehr
 * gültigem Token (alle Artikel bereits in einem Endzustand, siehe
 * `isFleaMarketExternalSellerTokenValid`). */
export async function findExternalSellerByToken(
  token: string,
): Promise<ExternalSellerContext | null> {
  const seller = await prisma.fleaMarketExternalSeller.findUnique({
    where: { token },
    include: { items: { select: { status: true } } },
  });
  if (!seller) return null;
  if (!isFleaMarketExternalSellerTokenValid(seller.items)) return null;

  return { id: seller.id, eventId: seller.eventId, name: seller.name };
}

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/utils/prisma";

/**
 * QR-Code-Ziel für ein einzelnes Exemplar (#271) — löst über die eindeutige
 * Inventarnummer auf und leitet zur Titel-Detailseite weiter. Bewusst kein
 * eigener Exemplar-Anzeigemodus: `/ludothek/[slug]` zeigt bei mehreren
 * Exemplaren desselben Titels ohnehin alle mit Standort/Zustand, ein Scan
 * eines konkreten Etiketts identifiziert nur "welches Spiel", nicht "welche
 * Tabellenzeile" — analog zum EAN-Scan-Verhalten im Gäste-Bereich
 * (ADR-0005). Auth-frei: dieselbe Sichtbarkeit wie die Zielseite selbst
 * (öffentlich für Gäste, mit Standort-/Kontaktdaten nur für eingeloggte
 * Meeple, siehe `toPublicGame()`).
 */
export default async function ExemplarRedirectPage({
  params,
}: {
  params: Promise<{ inventoryNumber: string }>;
}) {
  const { inventoryNumber } = await params;

  const copy = await prisma.gameCopy.findUnique({
    where: { inventoryNumber },
    select: { boardGame: { select: { slug: true } } },
  });
  if (!copy) notFound();

  redirect(`/ludothek/${copy.boardGame.slug}`);
}

import { redirect } from "next/navigation";
import { formatShortIdSlug, parseShortId } from "@/lib/short-id/short-id";
import {
  copyDetailPath,
  findCopyByInventoryNumber,
} from "@/lib/short-id/resolve";
import { renderGameDetail } from "../render-game-detail";

/**
 * Spiele-Detailseite mit per QR-Code vorausgewähltem Exemplar (#548) —
 * dieselbe Seite wie `/ludothek/[slug]`, keine eigene Exemplar-Seite.
 * Gehört `inv-<n>` zu einem anderen Spiel, wird auf die richtige URL
 * korrigiert; eine unbekannte oder ungültige Nummer fällt auf die
 * Detailseite ohne Vorauswahl zurück.
 */
export default async function GameCopyDetailPage({
  params,
}: {
  params: Promise<{ slug: string; copySlug: string }>;
}) {
  const { slug, copySlug } = await params;

  const shortId = parseShortId(copySlug);
  const copy =
    shortId?.kind === "inv"
      ? await findCopyByInventoryNumber(shortId.id)
      : null;
  if (!shortId || shortId.kind !== "inv" || !copy) {
    redirect(`/ludothek/${slug}`);
  }

  // Auch `INV-7` → `inv-7`: eine kanonische URL je Exemplar.
  if (copy.boardGameSlug !== slug || copySlug !== formatShortIdSlug(shortId)) {
    redirect(copyDetailPath(copy.boardGameSlug, shortId.id));
  }

  return renderGameDetail(slug, copy.id);
}

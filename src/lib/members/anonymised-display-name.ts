import { createHash } from "node:crypto";
import { ANONYMER_MEEPLE_NAME } from "@/lib/ludothek/anonymer-meeple";

/**
 * 6 Hex-Stellen aus der Meeple-ID abgeleitet, kein Jahresbezug/Zähler (#364)
 * — reiner Usability-, kein Datenschutzproblem (nur `games:manage` sieht den
 * Suffix überhaupt), siehe Kollisionsanalyse im Issue.
 */
function idSuffix(meepleId: string): string {
  return createHash("sha256").update(meepleId).digest("hex").slice(0, 6);
}

/**
 * Displayname für einen (potenziell) Stufe-2-anonymisierten Alt-Meeple
 * (#364): alle außer `games:manage` sehen identisch `"Anonymer Meeple"` —
 * ununterscheidbar vom dauerhaften Sammelkonto gleichen Namens. Nur
 * `games:manage` bekommt einen Suffix, um einzelne historische Fälle
 * auseinanderzuhalten (z. B. wer hatte welches Spiel).
 *
 * Das Sammelkonto selbst hat kein `anonymizedAt` (es wurde nie anonymisiert,
 * sondern absichtlich mit diesem Namen angelegt) und bekommt hier deshalb
 * nie einen Suffix — unabhängig vom Betrachter.
 */
export function anonymisedMeepleDisplayName(
  meeple: { id: string; displayName: string; anonymizedAt: Date | null },
  canSeeSuffix: boolean,
): string {
  if (!meeple.anonymizedAt) return meeple.displayName;
  if (!canSeeSuffix) return ANONYMER_MEEPLE_NAME;
  return `${ANONYMER_MEEPLE_NAME} #${idSuffix(meeple.id)}`;
}

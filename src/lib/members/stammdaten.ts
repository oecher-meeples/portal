import "server-only";
import { PendingChangeKind } from "@prisma/client";
import {
  listOpenPendingChangesForMember,
  type StammdatenDiff,
} from "@/lib/members/pending-changes";
import {
  STAMMDATEN_FIELD_LABELS,
  type StammdatenField,
} from "@/lib/members/stammdaten-labels";

/** Noch offene `MEMBER_STAMMDATEN`-Anträge genau eines Members, für die
 * Anzeige unterhalb des Stammdaten-Bereichs (#380, nur `admin:access`). */
export async function listOpenStammdatenChanges(memberId: string) {
  return listOpenPendingChangesForMember(
    memberId,
    PendingChangeKind.MEMBER_STAMMDATEN,
  );
}

/** Menschenlesbare Zusammenfassung eines Stammdaten-Diffs für die
 * `PendingChangesPanel`-`displayValue` (mehrere Felder auf einen Blick).
 * `tshirtSizeLabelById` löst die #388-`tshirtSizeId` zu ihrem Label auf —
 * ohne Eintrag (Größe zwischenzeitlich gelöscht) bleibt die rohe id stehen. */
export function formatStammdatenDiffSummary(
  fieldsJson: string | null,
  tshirtSizeLabelById: Record<string, string> = {},
) {
  const diff = JSON.parse(fieldsJson ?? "{}") as StammdatenDiff;
  return (
    Object.entries(diff)
      .map(([field, change]) => {
        const label =
          STAMMDATEN_FIELD_LABELS[field as StammdatenField] ?? field;
        // `fieldsJson` ist einmal durch JSON durch — ein `birthDate`
        // (ursprünglich ein Date) kommt hier als ISO-String zurück, nie als
        // Date-Instanz (JSON.parse revived keine Dates).
        const value =
          field === "birthDate" && typeof change.new === "string"
            ? new Date(change.new).toLocaleDateString("de-DE")
            : field === "tshirtSizeId" && typeof change.new === "string"
              ? (tshirtSizeLabelById[change.new] ?? change.new)
              : (change.new ?? "—");
        return `${label}: ${value}`;
      })
      .join(", ") || "—"
  );
}

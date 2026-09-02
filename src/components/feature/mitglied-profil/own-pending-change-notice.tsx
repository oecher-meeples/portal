import { formatDatePlain } from "@/lib/utils/format";

/** Geteilt von Stammdaten- und Bankverbindungs-Bereich (#380/#381) — zeigt
 * der antragstellenden Person (Meeple-selbst oder Erziehungsberechtigte:r)
 * an, dass ihr Änderungsantrag noch auf Freigabe wartet. Anders als
 * `PendingChangesPanel` keine Freigeben/Ablehnen-Aktionen und keine
 * Klartext-Anzeige — das bleibt Kassenwart/Vorstand vorbehalten. */
export function OwnPendingChangeNotice({
  requestedAt,
}: {
  requestedAt: string;
}) {
  return (
    <p className="bg-muted rounded-md px-3 py-2 text-sm">
      Änderungsantrag vom {formatDatePlain(requestedAt)} wartet auf Freigabe.
    </p>
  );
}

import { formatDatePlain } from "@/lib/utils/format";
import type { ActiveMeepleHolding } from "@/lib/ludothek/holdings-by-meeple";
import {
  AcceptReturnDialog,
  GiveToMeepleDialog,
} from "@/components/widgets/game-holding/holding-mini-dialogs";

/** Vereinsspiele-Bereich der Profilseite (#383) — nur sichtbar, wenn
 * mindestens eine aktive Ausleihe existiert (der Aufrufer blendet den
 * Bereich sonst ganz aus). Quick Actions wiederverwenden die bestehenden
 * Holdings-Dialoge 1:1 (`GiveToMeepleDialog`/`AcceptReturnDialog`) — die
 * Weitergabe-Logik selbst kennt keine "eigene" vs. "fremde" Ausleihe, sie
 * bezieht sich immer auf den aktuellen Halter des Exemplars (hier: dieses
 * Mitglied), unabhängig davon, wer den Button klickt (Spielewart,
 * Erziehungsberechtigte:r oder das Mitglied selbst).
 *
 * #443: sieht das Mitglied sein eigenes Profil an (`viewerIsSubject`), kann
 * es das Exemplar nicht von sich selbst annehmen — der "An mich"-Tab von
 * `AcceptReturnDialog` wird dann unterdrückt. Für Spielewart/
 * Erziehungsberechtigte:r (`viewerIsSubject: false`) bleibt er verfügbar. */
export function VereinsspieleSection({
  holdings,
  viewerIsSubject,
}: {
  holdings: ActiveMeepleHolding[];
  viewerIsSubject: boolean;
}) {
  if (holdings.length === 0) return null;

  return (
    <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
      <h2 className="font-serif text-lg font-bold">Vereinsspiele</h2>
      <ul className="flex flex-col divide-y text-sm">
        {holdings.map((holding) => (
          <li
            key={holding.gameCopyId}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium">{holding.boardGameTitle}</p>
              <p className="text-muted-foreground">
                seit {formatDatePlain(holding.startedAt)}
                {holding.inventoryNumber && ` · ${holding.inventoryNumber}`}
              </p>
            </div>
            <div className="flex gap-2">
              {/* #455: außerhalb eines Dropdown-Menüs braucht der Trigger
               * sichtbare Button-Optik statt des dortigen ghost-Defaults. */}
              <GiveToMeepleDialog
                gameCopyId={holding.gameCopyId}
                triggerClassName="w-auto"
                triggerVariant="outline"
              />
              <AcceptReturnDialog
                gameCopyId={holding.gameCopyId}
                triggerClassName="w-auto"
                triggerVariant="outline"
                hideSelfMode={viewerIsSubject}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

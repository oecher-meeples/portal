import { ActionButton } from "@/components/ui/action-button";
import {
  requestOwnDeletion,
  withdrawOwnDeletionRequest,
} from "@/lib/members/own-profile-actions";
import { deletionRequestStatus } from "@/lib/members/deletion-requests";
import { formatDatePlain } from "@/lib/utils/format";
import type { OpenHoldingsSummary } from "@/lib/members/open-holdings";

function OpenHoldingsHint({ games, units }: OpenHoldingsSummary) {
  if (games === 0 && units === 0) return null;

  const parts = [
    games > 0 ? `${games} Vereinsspiel${games === 1 ? "" : "e"}` : null,
    units > 0
      ? `${units} Aufbewahrungseinheit${units === 1 ? "" : "en"}`
      : null,
  ].filter(Boolean);

  return (
    <p className="text-muted-foreground text-sm">
      Bei dir liegen noch {parts.join(" und ")}. Die Löschung kann erst
      abgeschlossen werden, wenn das zurück im Verein ist — den Antrag kannst du
      trotzdem jetzt stellen.
    </p>
  );
}

export function DeletionRequestPanel({
  requestedAt,
  openHoldings,
}: {
  requestedAt: Date | null;
  openHoldings: OpenHoldingsSummary;
}) {
  if (requestedAt) {
    const { deadlineAt } = deletionRequestStatus(requestedAt);

    return (
      <div className="flex flex-col items-start gap-3">
        <p className="bg-primary/10 rounded-md p-3 text-sm">
          Dein Löschantrag vom {formatDatePlain(requestedAt)} ist eingegangen.
          Der Vorstand muss ihn bis zum {formatDatePlain(deadlineAt)} bearbeiten
          (ein Monat, Art. 12 Abs. 3 DSGVO).
        </p>
        <OpenHoldingsHint {...openHoldings} />
        <ActionButton action={withdrawOwnDeletionRequest} variant="outline">
          Antrag zurückziehen
        </ActionButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground text-sm">
        Du kannst die Löschung deiner personenbezogenen Daten verlangen (Art. 17
        DSGVO). Der Antrag wird mit Datum vermerkt, damit die gesetzliche
        Monatsfrist nachvollziehbar bleibt. Verleih- und Vereinshistorie bleiben
        anschließend ohne Personenbezug erhalten.
      </p>
      <OpenHoldingsHint {...openHoldings} />
      <ActionButton
        action={requestOwnDeletion}
        confirm="Löschung deiner personenbezogenen Daten beantragen?"
        variant="outline"
        className="border-destructive/40 text-destructive hover:bg-destructive/10"
      >
        Löschung meiner Daten beantragen
      </ActionButton>
    </div>
  );
}

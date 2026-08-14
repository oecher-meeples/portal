"use client";

import { useState } from "react";
import { UserMinus } from "lucide-react";
import { ActionDialog } from "@/components/ui/action-dialog";
import { Button } from "@/components/ui/button";
import { nextTurnOfTheYear } from "@/lib/members/meeples";
import {
  getOpenHoldingsSummary,
  recordResignation,
} from "@/components/feature/admin-mitglieder/actions";

export function ResignMembershipDialog({
  meepleId,
  displayName,
}: {
  meepleId: string;
  displayName: string;
}) {
  const [summary, setSummary] = useState<{
    games: number;
    units: number;
  } | null>(null);

  return (
    <ActionDialog
      trigger={
        <Button variant="destructive" size="sm">
          <UserMinus />
          Kündigung vermerken
        </Button>
      }
      title={`Kündigung für „${displayName}“ vermerken`}
      description="Die Mitgliedschaft läuft bis zum Jahreswechsel unverändert weiter — ausleihen bleibt bis dahin möglich."
      submitLabel="Kündigung vermerken"
      action={() => recordResignation(meepleId, nextTurnOfTheYear())}
      onOpen={async () => setSummary(await getOpenHoldingsSummary(meepleId))}
      onReset={() => setSummary(null)}
    >
      {summary && (summary.games > 0 || summary.units > 0) && (
        <p className="bg-primary/10 rounded-md p-3 text-sm">
          Bei diesem Mitglied liegen aktuell {summary.games}{" "}
          {summary.games === 1 ? "Spiel" : "Spiele"} und {summary.units}{" "}
          {summary.units === 1 ? "Einheit" : "Einheiten"}. Das blockiert die
          Kündigung nicht, wird aber ab Dezember als Rückholliste angezeigt.
        </p>
      )}
    </ActionDialog>
  );
}

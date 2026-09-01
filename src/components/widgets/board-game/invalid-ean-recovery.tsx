import { Button } from "@/components/ui/button";

/** Recovery-Popup fürs Speichern mit ungültiger EAN (#322) — statt eines
 * reinen Blockier-Fehlertexts bietet es einen Weg nach vorn ("EAN löschen
 * und speichern") neben dem Abbruch zur Korrektur ("Zurück"). */
export function InvalidEanRecovery({
  message,
  onDeleteAndSave,
  onBack,
}: {
  message: string;
  onDeleteAndSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="border-destructive/50 bg-destructive/5 flex flex-col gap-2 rounded-md border p-3 text-sm">
      <p className="text-destructive font-medium">Fehlerhafte EAN gefunden</p>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onBack}>
          Zurück
        </Button>
        <Button type="button" size="sm" onClick={onDeleteAndSave}>
          EAN löschen und speichern
        </Button>
      </div>
    </div>
  );
}

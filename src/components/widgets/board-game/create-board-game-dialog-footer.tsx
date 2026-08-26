import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

type Step = 1 | 2 | 3;

/** Footer-Buttons des Anlegen-Wizards je Schritt — ausgelagert aus
 * `CreateBoardGameDialog`, da die Datei sonst die 400-Zeilen-Grenze reißt. */
export function CreateBoardGameDialogFooter({
  step,
  hasActiveDuplicate,
  hasPreview,
  canSubmit,
  isSubmitting,
  onSkipImport,
  onUseExistingCopy,
  onBack,
  onNext,
  onSubmit,
}: {
  step: Step;
  hasActiveDuplicate: boolean;
  hasPreview: boolean;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSkipImport: () => void;
  onUseExistingCopy: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <DialogFooter>
      {step === 1 && (
        <>
          <Button type="button" variant="outline" onClick={onSkipImport}>
            Ohne Import fortfahren
          </Button>
          {hasActiveDuplicate ? (
            <Button type="button" onClick={onUseExistingCopy}>
              Weiteres Exemplar anlegen
            </Button>
          ) : (
            <Button type="button" onClick={onNext} disabled={!hasPreview}>
              Weiter
            </Button>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <Button type="button" variant="outline" onClick={onBack}>
            Zurück
          </Button>
          {hasActiveDuplicate ? (
            <Button type="button" onClick={onUseExistingCopy}>
              Weiteres Exemplar anlegen
            </Button>
          ) : (
            <Button type="button" onClick={onNext} disabled={!canSubmit}>
              Weiter
            </Button>
          )}
        </>
      )}
      {step === 3 && (
        <>
          <Button type="button" variant="outline" onClick={onBack}>
            Zurück
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? "Speichere…" : "Spiel anlegen"}
          </Button>
        </>
      )}
    </DialogFooter>
  );
}

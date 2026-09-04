import { ContactDialog } from "@/components/entities/contact-dialog";
import type { ContactDialogMeeple } from "@/lib/members/contact";

/**
 * Person (klickbar via `ContactDialog`, sofern ihre Kontaktdaten geladen
 * sind) führt, dann die Lagerort-Kette — der Abhol-Orientierungspunkt kommt
 * zuerst (#121 Standort-Kette). Extrahiert aus `game-copies-section.tsx`
 * (dortiges `LocationCell`), weil `admin-bestand-rows.ts`/
 * `admin-bestand-view.tsx` (#121-Folge) exakt dieselbe Zelle brauchen.
 */
export function LocationChainCell({
  responsibleName,
  responsibleContactMeeple,
  unitChain,
  isUnconfirmed = false,
}: {
  responsibleName: string | null;
  /** `null` ohne verantwortliche Person oder ohne deren Meeple-Konto — die
   * Zelle zeigt dann nur den Klartext-Namen ohne `ContactDialog`. */
  responsibleContactMeeple: ContactDialogMeeple | null;
  unitChain: string;
  isUnconfirmed?: boolean;
}) {
  if (!responsibleName && !unitChain) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  return (
    <span className="text-muted-foreground text-sm">
      {responsibleName && (
        <>
          bei{" "}
          {responsibleContactMeeple ? (
            <ContactDialog
              name={responsibleName}
              meeple={responsibleContactMeeple}
            />
          ) : (
            responsibleName
          )}
          {isUnconfirmed && " (Unbestätigt)"}
        </>
      )}
      {responsibleName && unitChain && " → "}
      {unitChain}
    </span>
  );
}

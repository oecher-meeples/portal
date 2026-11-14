import { ContributorPill } from "@/components/entities/contributor-pill";

/** Ab dieser Anzahl zeigt die Kurzfassung keine Illustratoren mehr — BGG
 * führt sie über alle Editionen zusammen, eine lange Pill-Wand verdrängt den
 * Rest der Karte. Filter und Detailseite kennen weiterhin alle Namen. */
const MAX_SUMMARY_ILLUSTRATORS = 2;

/** Verlag (Text) + Illustrator(en) (Pills) unter dem Titel — geteilt von
 * `GameCard` und `GameListRow`, die beide dieselbe Kurzfassung zeigen
 * (Epic #490). */
export function GameContributorSummary({
  publisher,
  illustrator,
}: {
  publisher: string[];
  illustrator: string[];
}) {
  return (
    <>
      {publisher.length > 0 && (
        <p className="text-muted-foreground text-sm">{publisher.join(", ")}</p>
      )}
      {illustrator.length > 0 &&
        illustrator.length <= MAX_SUMMARY_ILLUSTRATORS && (
          <div className="flex flex-wrap gap-1">
            {illustrator.map((name) => (
              <ContributorPill key={name} name={name} roles={["ILLUSTRATOR"]} />
            ))}
          </div>
        )}
    </>
  );
}

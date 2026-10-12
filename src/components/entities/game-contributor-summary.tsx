import { ContributorPill } from "@/components/entities/contributor-pill";

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
      {illustrator.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {illustrator.map((name) => (
            <ContributorPill key={name} name={name} roles={["ILLUSTRATOR"]} />
          ))}
        </div>
      )}
    </>
  );
}

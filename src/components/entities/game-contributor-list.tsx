import { ContributorPill } from "@/components/entities/contributor-pill";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { GameContributorDisplay } from "@/lib/ludothek/taxonomy/game-contributors-display";

function ContributorPills({
  contributors,
  className,
}: {
  contributors: GameContributorDisplay[];
  className?: string;
}) {
  return (
    <div className={className ?? "flex flex-wrap gap-1.5"}>
      {contributors.map((contributor) => (
        <ContributorPill
          key={contributor.name}
          name={contributor.name}
          roles={contributor.roles}
        />
      ))}
    </div>
  );
}

/** Mitwirkende im Kopfbereich der Detailseite (Verlag, Autoren und — solange
 * es wenige sind — Illustratoren). Siehe `splitContributorsForDetail()`. */
export function GameContributorList({
  contributors,
}: {
  contributors: GameContributorDisplay[];
}) {
  if (contributors.length === 0) return null;

  return (
    <ContributorPills
      contributors={contributors}
      className="mt-2 flex flex-wrap gap-1.5"
    />
  );
}

/** Eingeklappte Karte am Seitenende für viele Illustratoren — BGG führt sie
 * über alle Editionen zusammen (z. B. 40+), sie sollen Verlag und Autoren im
 * Kopfbereich nicht verdrängen. Gleiche Karten-Optik wie `GameCopiesSection`. */
export function GameIllustratorsCard({
  illustrators,
}: {
  illustrators: GameContributorDisplay[];
}) {
  if (illustrators.length === 0) return null;

  return (
    <Accordion className="bg-card rounded-lg border">
      <AccordionItem value="illustrators" className="border-b-0">
        <AccordionTrigger className="px-5 py-4 font-serif text-lg font-bold hover:no-underline">
          Illustratoren ({illustrators.length})
        </AccordionTrigger>
        <AccordionPanel>
          <ContributorPills
            contributors={illustrators}
            className="flex flex-wrap gap-1.5 px-5"
          />
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

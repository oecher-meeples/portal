import {
  ExplainerDirectory,
  type ExplainerDirectoryEntry,
} from "@/components/feature/erklaerbaeren/explainer-directory";
import {
  MyExplainerGames,
  type MyExplainerGame,
  type SelectableGame,
} from "@/components/feature/erklaerbaeren/my-explainer-games";
import { MyPrivateGamesAccordion } from "@/components/feature/erklaerbaeren/my-private-games-accordion";
import type { OwnPrivateGameExplainerEntry } from "@/lib/explainer/queries";
import { PageContainer } from "@/components/ui/page-container";

export function ErklaerbaerenView({
  directory,
  myGames,
  availableGames,
  privateGames = [],
  isAdmin,
}: {
  directory: ExplainerDirectoryEntry[];
  myGames: MyExplainerGame[];
  availableGames: SelectableGame[];
  /** Eigene BGG-Importe mit Erklärbär-Niveau (#654). */
  privateGames?: OwnPrivateGameExplainerEntry[];
  /** Full directory (alle Spiele × alle Erklärbären) ist admin-only (#210) —
   * Meeple sehen nur ihre eigenen Einträge unten. */
  isAdmin: boolean;
}) {
  return (
    <PageContainer className="gap-8">
      {isAdmin && (
        <section className="flex flex-col gap-3">
          <ExplainerDirectory entries={directory} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <MyExplainerGames myGames={myGames} availableGames={availableGames} />
      </section>

      <MyPrivateGamesAccordion games={privateGames} />
    </PageContainer>
  );
}

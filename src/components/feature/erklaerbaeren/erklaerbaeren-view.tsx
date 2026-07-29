import {
  ExplainerDirectory,
  type ExplainerDirectoryEntry,
} from "@/components/feature/erklaerbaeren/explainer-directory";
import {
  MyExplainerGames,
  type MyExplainerGame,
  type SelectableGame,
} from "@/components/feature/erklaerbaeren/my-explainer-games";

export function ErklaerbaerenView({
  directory,
  myGames,
  availableGames,
}: {
  directory: ExplainerDirectoryEntry[];
  myGames: MyExplainerGame[];
  availableGames: SelectableGame[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold">
          Erklärbären-Verzeichnis
        </h2>
        <ExplainerDirectory entries={directory} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold">
          Meine Spiele als Erklärbär
        </h2>
        <MyExplainerGames myGames={myGames} availableGames={availableGames} />
      </section>
    </div>
  );
}

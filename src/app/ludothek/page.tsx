import { requireMember } from "@/lib/session";
import { PageHeading } from "@/components/ui/page-heading";
import { GAMES, TOTAL_GAMES_IN_INVENTORY } from "@/data/games";
import { LudothekBrowser } from "@/components/feature/ludothek/ludothek-browser";

export default async function LudothekPage() {
  await requireMember();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        eyebrow="Das HerzstÃ¼ck"
        title={`Ludothek â€“ ${TOTAL_GAMES_IN_INVENTORY} Spiele`}
        description="DurchstÃ¶bere den Vereinsbestand, filtere nach Spieleranzahl oder Dauer und leihe transaktionssicher aus."
      />
      <LudothekBrowser games={GAMES} />
    </div>
  );
}

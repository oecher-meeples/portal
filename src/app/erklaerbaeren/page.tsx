import { requireMember, hasPermissionInCurrentView } from "@/lib/auth/session";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeading } from "@/components/ui/page-heading";
import { ErklaerbaerenView } from "@/components/feature/erklaerbaeren/erklaerbaeren-view";
import { MyGamesTab } from "@/components/feature/erklaerbaeren/my-games-tab";
import { DirectoryTab } from "@/components/feature/erklaerbaeren/directory-tab";
import { parseErklaerbaerenTab } from "@/components/feature/erklaerbaeren/erklaerbaeren-url";
import { getMyExplainerGames } from "@/lib/explainer/game-list-queries";
import { getExplainerDirectory } from "@/lib/explainer/directory-queries";
import {
  parseDirectoryFilter,
  parseExplainerGameFilter,
} from "@/lib/explainer/game-list";

type SearchParams = Promise<{ tab?: string; filter?: string; q?: string }>;

export default async function ErklaerbaerenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { user, meeple } = await requireMember();
  const canManage = await hasPermissionInCurrentView(user.id, "events:manage");
  // Verzeichnis-Daten nur mit Berechtigung — ohne sie fällt der Tab auf Tab 1.
  const tab = canManage ? parseErklaerbaerenTab(params.tab) : "meine";
  const directoryFilter = parseDirectoryFilter(params.filter);
  const gameFilter = parseExplainerGameFilter(params.filter);

  return (
    <PageContainer>
      <PageHeading
        eyebrow="Mitgliederbereich"
        title="Erklärbären"
        description="Trage ein, welche Spiele du erklären kannst und wie sicher du dabei bist."
      />
      <ErklaerbaerenView tab={tab} showDirectory={canManage}>
        {tab === "verzeichnis" ? (
          <DirectoryTab
            filter={directoryFilter}
            query={params.q ?? ""}
            entries={await getExplainerDirectory({
              filter: directoryFilter,
              query: params.q,
            })}
          />
        ) : (
          <MyGamesTab
            filter={gameFilter}
            games={await getMyExplainerGames(meeple.id, gameFilter)}
          />
        )}
      </ErklaerbaerenView>
    </PageContainer>
  );
}

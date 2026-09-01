import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type { ExplainerExperienceLevel } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/page-container";
import { RibbonCorner } from "@/components/ui/ribbon-corner";
import { CardCornerOverlay } from "@/components/ui/card-corner-overlay";
import { YoutubeIcon } from "@/components/ui/youtube-icon";
import { BggRatingBadge } from "@/components/entities/bgg-rating-badge";
import { LanguageIndependentPill } from "@/components/entities/language-independent-pill";
import { GameCoverMedia } from "@/components/entities/game-cover-media";
import { RelatedGameCard } from "@/components/entities/related-game-card";
import { ExplainerVideo } from "@/components/entities/explainer-video";
import { ExplainerGamePanel } from "@/components/feature/ludothek/explainer-game-panel";
import {
  AssignExpansionDialog,
  type GameOption,
} from "@/components/widgets/board-game/assign-expansion-dialog";
import { removeExpansionAssignment } from "@/lib/ludothek/board-games";
import {
  EditBoardGameTitleDialog,
  type EditableBoardGameTitle,
} from "@/components/widgets/board-game/edit-board-game-title-dialog";
import {
  GameCopiesSection,
  type GameCopyRow,
} from "@/components/feature/ludothek/game-copies-section";
import type { PublicLudothekGame } from "@/lib/ludothek/browser";
import type { ExplainerEntry } from "@/lib/explainer/queries";
import type { OpenLfgPostForBoardGame } from "@/lib/content/lfg";
import type { GuestCopyAvailability } from "@/lib/events/guest-area";
import { formatDateMedium } from "@/lib/utils/format";
import { buildYoutubeRulesSearchUrl } from "@/lib/utils/youtube";

export type HoldingHistoryEntry = {
  id: string;
  origin: string;
  target: string;
  startedAt: string;
  endedAt: string | null;
  confirmedAt: string | null;
  recordedByName: string;
};

export function GameDetailView({
  game,
  bggId,
  explainer,
  expansionAssignment,
  titleEdit,
  mechanicsOptions,
  copies,
  canManageGames,
  relatedLocationChains,
  availability,
  openLfgPosts,
  createLfgTrigger,
  marketListingSection,
}: {
  game: PublicLudothekGame;
  /** BGG-Verknüpfung dieses Titels, `null` bei manuell angelegten Titeln
   * ohne BGG-Import — separat von `game`, weil `toPublicGame()` `bggId` als
   * Bestandsdatum für Gäste entfernt, der externe Link aber für alle
   * gedacht ist (#207). */
  bggId?: number | null;
  /** Nur für eingeloggte Nutzer gesetzt — Erklärbär-Selbstauskunft ist kein Gast-Feature. */
  explainer?: {
    entries: ExplainerEntry[];
    myLevel: ExplainerExperienceLevel | null;
  };
  /** Only set for `games:manage` holders — manual base game ↔ expansion pflege (#30). */
  expansionAssignment?: {
    options: GameOption[];
  };
  /** Only set for `games:manage` holders — edits the shared title (#121/#122). */
  titleEdit?: EditableBoardGameTitle;
  /** Autocomplete-Vorschläge for `titleEdit`'s Mechaniken-Multiselect (#124). */
  mechanicsOptions?: string[];
  /** Every physical copy of this title — only set internally, guests get a
   * plain count instead (#121, guest aggregation is a later step). */
  copies?: GameCopyRow[];
  canManageGames?: boolean;
  /** Standort per linked base game/expansion id — only set internally (#121). */
  relatedLocationChains?: Record<string, string>;
  /** Only set for guests — internal viewers get the full `copies` breakdown instead (#121). */
  availability?: GuestCopyAvailability;
  /** Only set for members (LFG is a members-only feature) — omitted entirely when empty (#34). */
  openLfgPosts?: OpenLfgPostForBoardGame[];
  /** Fully rendered "Spielergesuch eröffnen" dialog+trigger, composed by the
   * page — only passed for logged-in Meeples. Kept as a prop instead of an
   * import so this feature stays isolated from `components/feature/lfg`
   * (#142, see CLAUDE.md layer rules). */
  createLfgTrigger?: ReactNode;
  /** Fertig gerenderter Marktplatz-Hinweis/-Trigger ("wird verkauft" oder
   * "Verkaufen"), von der Seite komponiert — analog `createLfgTrigger`, hält
   * diesen Titel von `components/feature/markt` isoliert (#278). */
  marketListingSection?: ReactNode;
}) {
  return (
    // Drei Top-Level-Grid-Items statt zwei Spalten (#400): auf schmalen
    // Displays stapeln sie in Quelltext-Reihenfolge — Titelblock, Bild,
    // Rest —, das Bild landet damit zwischen der Spieler/Dauer/Gewichtung-
    // Zeile und den Mechaniken. Ab `lg` bekommt jedes Item eine explizite
    // Grid-Position, die wieder das klassische Bild-neben-Text-Layout
    // ergibt (Bild spannt beide Zeilen der rechten Spalte).
    <PageContainer className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
      <div className="lg:col-start-2 lg:row-start-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-tight">
                {game.title}
              </h1>
              {game.secondaryTitle && (
                <p className="text-muted-foreground">{game.secondaryTitle}</p>
              )}
              <LanguageIndependentPill
                languageDependence={game.languageDependence}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {createLfgTrigger}
            {marketListingSection}
            {bggId && (
              <Button
                variant="outline"
                className="gap-1.5 px-2.5"
                aria-label="Auf BoardGameGeek ansehen"
                render={
                  <a
                    href={`https://boardgamegeek.com/boardgame/${bggId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- statisches Logo aus public/, keine Optimierung nötig */}
                <img src="/bgg-logo.svg" alt="" className="h-4 w-auto" />
                <ExternalLink className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-muted-foreground mt-1">
          {game.minPlayers && game.maxPlayers
            ? `${game.minPlayers}–${game.maxPlayers} Spieler`
            : null}
          {game.playTimeMinutes ? ` · ${game.playTimeMinutes} Min.` : ""}
          {game.weight ? ` · Gewichtung ${game.weight.toFixed(1)}/5` : ""}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-md lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <GameCoverMedia imageUrl={game.imageUrl} title={game.title} />
        {game.kind === "BOARDGAME_EXPANSION" && (
          <RibbonCorner>Erweiterung</RibbonCorner>
        )}
        <CardCornerOverlay corner="top-right">
          <BggRatingBadge averageRating={game.averageRating} />
        </CardCornerOverlay>
        {titleEdit && (
          <CardCornerOverlay corner="bottom-right">
            <EditBoardGameTitleDialog
              game={titleEdit}
              mechanicsOptions={mechanicsOptions}
            />
          </CardCornerOverlay>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:col-start-2 lg:row-start-2">
        <div className="flex flex-wrap gap-2">
          {game.mechanics.map((mechanic) => (
            <span
              key={mechanic}
              className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
            >
              {mechanic}
            </span>
          ))}
          {game.categories.map((category) => (
            <span
              key={category}
              className="bg-muted rounded-full px-3 py-1 text-xs font-medium"
            >
              {category}
            </span>
          ))}
        </div>

        {availability && (
          <p className="text-muted-foreground text-sm">
            {availability.kind === "event"
              ? `${availability.available} von ${availability.inRoom} verfügbar${
                  availability.shelfLabels.length > 0
                    ? ` (${availability.shelfLabels.join(", ")})`
                    : ""
                }`
              : `${availability.total} ${availability.total === 1 ? "Exemplar" : "Exemplare"}`}
          </p>
        )}

        {game.kind === "BOARDGAME_EXPANSION" && expansionAssignment && (
          <AssignExpansionDialog
            game={{ id: game.boardGameId, kind: game.kind }}
            options={expansionAssignment.options}
          />
        )}
        {game.baseGames.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-sm">
              Erweiterung zu:
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {game.baseGames.map((baseGame) => (
                <RelatedGameCard
                  key={baseGame.id}
                  game={baseGame}
                  locationChain={relatedLocationChains?.[baseGame.id]}
                  removeAction={
                    expansionAssignment
                      ? removeExpansionAssignment.bind(
                          null,
                          baseGame.id,
                          game.boardGameId,
                        )
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Nur auf echten Basisspielen anbieten (kein `kind`-Mismatch durch
            fehlenden BGG-Abgleich, siehe Plan-Schritt 5) — eine Erweiterung
            bekommt ihren "Basisspiel zuordnen"-Trigger oben stattdessen. */}
        {game.kind !== "BOARDGAME_EXPANSION" &&
          game.baseGames.length === 0 &&
          expansionAssignment && (
            <AssignExpansionDialog
              game={{ id: game.boardGameId, kind: game.kind }}
              options={expansionAssignment.options}
            />
          )}
        {game.expansions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-muted-foreground text-sm">
              Erweiterungen:
            </span>
            <div className="grid gap-2 sm:grid-cols-2">
              {game.expansions.map((expansion) => (
                <RelatedGameCard
                  key={expansion.id}
                  game={expansion}
                  locationChain={relatedLocationChains?.[expansion.id]}
                  removeAction={
                    expansionAssignment
                      ? removeExpansionAssignment.bind(
                          null,
                          game.boardGameId,
                          expansion.id,
                        )
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
          <h2 className="font-serif text-lg font-bold">Erklärung</h2>
          {game.description && (
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {game.description}
            </p>
          )}
          {game.explainerVideoUrl && (
            <ExplainerVideo url={game.explainerVideoUrl} />
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              render={
                <a
                  href={buildYoutubeRulesSearchUrl(game.title, "de")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <YoutubeIcon className="size-4" />
              Nach Regeln auf Youtube suchen
              <ExternalLink className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              render={
                <a
                  href={buildYoutubeRulesSearchUrl(game.title, "en")}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              <YoutubeIcon className="size-4" />
              Search for rules on Youtube
              <ExternalLink className="size-4" />
            </Button>
          </div>
        </div>

        {openLfgPosts && openLfgPosts.length > 0 && (
          <div className="bg-card flex flex-col gap-3 rounded-lg border p-5">
            <h2 className="font-serif text-lg font-bold">Offene Gesuche</h2>
            <ul className="flex flex-col divide-y">
              {openLfgPosts.map((post) => (
                <li key={post.id} className="flex flex-col gap-0.5 py-2.5">
                  <Link
                    href={`/lfg/${post.id}`}
                    className="hover:text-primary font-medium"
                  >
                    {post.title}
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {post.dateNote ??
                      (post.plannedAt
                        ? formatDateMedium(post.plannedAt)
                        : "Termin offen")}
                    {post.location ? ` · ${post.location}` : ""} ·{" "}
                    {post.participantCount}/{post.maxParticipants}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {explainer && (
          <ExplainerGamePanel
            boardGameId={game.boardGameId}
            boardGameTitle={game.title}
            explainers={explainer.entries}
            myLevel={explainer.myLevel}
          />
        )}

        {/* Zuletzt platziert (Plan-Schritt 6) — bündelt Zustand/Standort,
            Aufenthalts-Aktionen und die Historie je Exemplar in einem
            Bereich statt der früher verstreuten Einzel-Cards. */}
        {copies && (
          <GameCopiesSection
            copies={copies}
            boardGameId={game.boardGameId}
            boardGameTitle={game.title}
            canManageGames={Boolean(canManageGames)}
          />
        )}
      </div>
    </PageContainer>
  );
}

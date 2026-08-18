import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import type { BggGameData, BggSearchResult } from "@/lib/bgg/client";

/**
 * Schritt 1 des Anlegen-Wizards (#183): ein Feld, drei Interpretationen
 * (Titel/Link/BGG-ID) — die Auflösung selbst lebt im Dialog, hier nur die
 * Darstellung von Eingabe, Trefferliste und geladener Vorschau.
 */
export function CreateBoardGameBggImportStep({
  bggInput,
  onBggInputChange,
  onResolve,
  isResolving,
  searchResults,
  onSelectResult,
  preview,
  selectedExplainerVideoUrl,
  onSelectExplainerVideo,
}: {
  bggInput: string;
  onBggInputChange: (value: string) => void;
  onResolve: () => void;
  isResolving: boolean;
  searchResults: BggSearchResult[] | null;
  onSelectResult: (bggId: number) => void;
  preview: BggGameData | null;
  /** Aktuell im Formular stehende Erklärvideo-URL — hebt den gewählten
   * Treffer in der Auswahlliste hervor (#185). */
  selectedExplainerVideoUrl?: string;
  onSelectExplainerVideo?: (url: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onResolve();
        }}
      >
        <TextField
          id="bgg-input"
          label="Titel, BGG-Link oder BGG-ID"
          fieldClassName="flex-1"
          value={bggInput}
          onChange={(event) => onBggInputChange(event.target.value)}
          onClear={() => onBggInputChange("")}
          placeholder="z. B. Ark Nova, 342942 oder ein BGG-Link"
        />
        <Button type="submit" disabled={isResolving}>
          {isResolving ? "Suche…" : "Suchen"}
        </Button>
      </form>
      {searchResults && searchResults.length > 0 && !preview && (
        <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-1">
          {searchResults.map((result) => (
            <li key={result.bggId}>
              <button
                type="button"
                className="hover:bg-accent hover:text-accent-foreground group w-full rounded px-2 py-1.5 text-left text-sm"
                onClick={() => onSelectResult(result.bggId)}
                disabled={isResolving}
              >
                {result.title}
                {result.yearPublished && (
                  <span className="text-muted-foreground group-hover:text-accent-foreground/80">
                    {" "}
                    ({result.yearPublished})
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <div className="flex gap-3 rounded-md border p-3">
          {preview.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- BGG-hosted preview image, not next/image-optimizable
            <img
              src={preview.imageUrl}
              alt={preview.title}
              className="h-20 w-20 shrink-0 rounded object-contain"
            />
          )}
          <div className="flex flex-col gap-1 text-sm">
            <p className="font-medium">{preview.title}</p>
            {preview.minPlayers && preview.maxPlayers && (
              <p className="text-muted-foreground">
                {preview.minPlayers}–{preview.maxPlayers} Spieler
              </p>
            )}
            {preview.playTimeMinutes && (
              <p className="text-muted-foreground">
                {preview.playTimeMinutes} Min.
              </p>
            )}
          </div>
        </div>
      )}
      {preview && preview.germanExplainerVideos.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">
            Deutschsprachiges Regelvideo auswählen
          </p>
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border p-1">
            {preview.germanExplainerVideos.map((video) => {
              const isSelected = selectedExplainerVideoUrl === video.url;
              return (
                <li key={video.url}>
                  <button
                    type="button"
                    className={`hover:bg-accent hover:text-accent-foreground group w-full rounded px-2 py-1.5 text-left text-sm ${
                      isSelected ? "bg-accent text-accent-foreground" : ""
                    }`}
                    onClick={() => onSelectExplainerVideo?.(video.url)}
                  >
                    {video.title || video.url}
                    {video.channel && (
                      <span className="text-muted-foreground group-hover:text-accent-foreground/80">
                        {" "}
                        ({video.channel})
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

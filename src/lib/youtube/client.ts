import { requireEnv } from "@/lib/utils/require-env";
import { decodeHtmlEntities } from "@/lib/utils/decode-html-entities";

export class YoutubeApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "YoutubeApiError";
    this.status = status;
  }
}

export interface YoutubeVideoResult {
  title: string;
  url: string;
  channel: string;
  /** Für die Sortierung nach Reichweite (#185-Folgeanfrage) — reduziert das
   * Rauschen unter den Treffern. Nicht Teil von `BggExplainerVideo`, daher
   * für die Anzeige nicht relevant. */
  subscriberCount: number;
}

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const SEARCH_TIMEOUT_MS = 8000;
const MAX_RESULTS = 5;

interface YoutubeSearchItem {
  id?: { videoId?: string };
  snippet?: { title?: string; channelTitle?: string; channelId?: string };
}

interface YoutubeChannelItem {
  id?: string;
  statistics?: { subscriberCount?: string };
}

/**
 * Lädt die Abonnentenzahl je Kanal nach (#185-Folgeanfrage) — reduziert das
 * Rauschen unter den Treffern, indem etablierte Kanäle vor Kleinstkanälen
 * einsortiert werden. `channels.list` kostet nur 1 Quota-Einheit statt der
 * 100 Einheiten von `search.list`, fällt also im Tageslimit kaum ins Gewicht.
 * Schlägt der Aufruf fehl, wird stillschweigend ohne Sortierung
 * weitergemacht — die Auswahlliste selbst darf dadurch nie ausfallen.
 */
async function fetchSubscriberCounts(
  channelIds: string[],
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(channelIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const params = new URLSearchParams({
    part: "statistics",
    id: uniqueIds.join(","),
    key: requireEnv("YOUTUBE_API_KEY"),
  });

  try {
    const response = await fetch(
      `${YOUTUBE_CHANNELS_URL}?${params.toString()}`,
      {
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      },
    );
    if (!response.ok) return new Map();

    const json = (await response.json()) as { items?: YoutubeChannelItem[] };
    return new Map(
      (json.items ?? [])
        .filter((item): item is YoutubeChannelItem & { id: string } =>
          Boolean(item.id),
        )
        .map((item) => [
          item.id,
          Number(item.statistics?.subscriberCount ?? 0),
        ]),
    );
  } catch {
    return new Map();
  }
}

/**
 * Durchsucht YouTube direkt nach Regelvideos (#185-Folgeanfrage) — BGGs
 * `videos`-Block zeigt je Titel nur die ~15 aktuellsten Einträge, ein
 * existierendes deutsches Video kann also außerhalb dieses Fensters liegen
 * (siehe `client.ts` in `lib/bgg`). Kein Abrechnungskonto nötig: die
 * YouTube Data API v3 hat kein Pay-as-you-go, nur ein hartes Tageslimit von
 * 100 `search.list`-Aufrufen, das bei Überschreitung schlicht fehlschlägt.
 * `relevanceLanguage=de` ist nur ein Ranking-Hinweis, kein harter Filter —
 * der Admin sichtet die Treffer deshalb bewusst in einer Auswahlliste,
 * genau wie bei den BGG-Treffern. Die Liste wird nach Abonnentenzahl
 * absteigend sortiert, um das Rauschen durch Kleinstkanäle zu reduzieren
 * (#185-Folgeanfrage).
 */
export async function searchYoutubeVideos(
  query: string,
): Promise<YoutubeVideoResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    part: "snippet",
    q: trimmed,
    type: "video",
    order: "relevance",
    relevanceLanguage: "de",
    maxResults: String(MAX_RESULTS),
    key: requireEnv("YOUTUBE_API_KEY"),
  });

  let response: Response;
  try {
    response = await fetch(`${YOUTUBE_SEARCH_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new YoutubeApiError(
        "Die Anfrage an YouTube hat zu lange gedauert.",
      );
    }
    throw error;
  }

  if (!response.ok) {
    throw new YoutubeApiError(
      `YouTube-API-Anfrage fehlgeschlagen (${response.status}).`,
      response.status,
    );
  }

  const json = (await response.json()) as { items?: YoutubeSearchItem[] };

  const items = (json.items ?? []).filter(
    (item): item is YoutubeSearchItem & { id: { videoId: string } } =>
      item.id?.videoId !== undefined,
  );

  const subscriberCounts = await fetchSubscriberCounts(
    items.map((item) => item.snippet?.channelId ?? ""),
  );

  return items
    .map((item) => ({
      title: decodeHtmlEntities(item.snippet?.title ?? ""),
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channel: decodeHtmlEntities(item.snippet?.channelTitle ?? ""),
      subscriberCount: subscriberCounts.get(item.snippet?.channelId ?? "") ?? 0,
    }))
    .sort((a, b) => b.subscriberCount - a.subscriberCount);
}

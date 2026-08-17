import { XMLParser } from "fast-xml-parser";
import { requireEnv } from "@/lib/utils/require-env";

const BGG_API_BASE = "https://boardgamegeek.com/xmlapi2";

export class BggNotFoundError extends Error {
  constructor(bggId: number) {
    super(`BoardGameGeek-Eintrag mit ID ${bggId} wurde nicht gefunden.`);
    this.name = "BggNotFoundError";
  }
}

export class BggApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BggApiError";
    this.status = status;
  }
}

export interface BggGameData {
  title: string;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  weight: number | null;
  imageUrl: string | null;
  description: string | null;
  mechanics: string[];
  explainerVideoUrl: string | null;
}

interface BggNameEntry {
  type?: string;
  value: string;
}

interface BggLinkEntry {
  type?: string;
  value: string;
}

interface BggVideoEntry {
  category?: string;
  link?: string;
}

interface BggItem {
  name?: BggNameEntry | BggNameEntry[];
  description?: string;
  minplayers?: { value?: string };
  maxplayers?: { value?: string };
  playingtime?: { value?: string };
  image?: string;
  link?: BggLinkEntry | BggLinkEntry[];
  statistics?: {
    ratings?: {
      averageweight?: { value?: string };
    };
  };
  videos?: {
    video?: BggVideoEntry | BggVideoEntry[];
  };
}

interface BggThingResponse {
  items?: {
    item?: BggItem | BggItem[];
  };
}

export interface BggSearchResult {
  bggId: number;
  title: string;
  yearPublished: number | null;
}

interface BggSearchItem {
  id?: string;
  name?: BggNameEntry | BggNameEntry[];
  yearpublished?: { value?: string };
}

interface BggSearchResponse {
  items?: {
    item?: BggSearchItem | BggSearchItem[];
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  htmlEntities: true,
  isArray: (name, _jpath, _isLeafNode, isAttribute) =>
    !isAttribute &&
    (name === "name" || name === "link" || name === "video" || name === "item"),
});

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
};

function decodeHtmlEntities(input: string): string {
  return input
    .replace(
      /&amp;|&quot;|&apos;|&lt;|&gt;|&nbsp;|&mdash;|&ndash;|&hellip;/g,
      (match) => HTML_ENTITY_MAP[match],
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code)),
    );
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);

function isYoutubeLink(link: string): boolean {
  try {
    return YOUTUBE_HOSTS.has(new URL(link).hostname);
  } catch {
    return false;
  }
}

function selectExplainerVideoUrl(videos: BggItem["videos"]): string | null {
  const entry = toArray(videos?.video).find(
    (video) =>
      video.category === "instructional" &&
      video.link !== undefined &&
      isYoutubeLink(video.link),
  );
  return entry?.link ?? null;
}

function mapItem(item: BggItem): BggGameData {
  const names = toArray(item.name);
  const primaryName = names.find((name) => name.type === "primary") ?? names[0];

  const mechanics = toArray(item.link)
    .filter((link) => link.type === "boardgamemechanic")
    .map((link) => link.value);

  const rawWeight = parseNumber(item.statistics?.ratings?.averageweight?.value);

  return {
    title: primaryName?.value ?? "",
    minPlayers: parseNumber(item.minplayers?.value),
    maxPlayers: parseNumber(item.maxplayers?.value),
    playTimeMinutes: parseNumber(item.playingtime?.value),
    weight: rawWeight === null ? null : Math.round(rawWeight * 10) / 10,
    imageUrl: item.image ?? null,
    description:
      item.description === undefined
        ? null
        : decodeHtmlEntities(item.description),
    mechanics,
    explainerVideoUrl: selectExplainerVideoUrl(item.videos),
  };
}

const FETCH_TIMEOUT_MS = 8000;
/** BGG-Metadaten (Titel, Spielerzahl, Beschreibung, …) ändern sich praktisch nie. */
const REVALIDATE_SECONDS = 24 * 60 * 60;

async function fetchBggXml(
  path: string,
  revalidateSeconds: number,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${BGG_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${requireEnv("BGG_BEARER_TOKEN")}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: revalidateSeconds },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new BggApiError(
        "Die Anfrage an BoardGameGeek hat zu lange gedauert.",
      );
    }
    throw error;
  }
  if (!response.ok) {
    throw new BggApiError(
      `BoardGameGeek-API-Anfrage fehlgeschlagen (${response.status}).`,
      response.status,
    );
  }
  return response.text();
}

export async function fetchBggGame(bggId: number): Promise<BggGameData> {
  const xml = await fetchBggXml(
    `/thing?id=${bggId}&stats=1&videos=1`,
    REVALIDATE_SECONDS,
  );
  const parsed = parser.parse(xml) as BggThingResponse;
  const item = toArray(parsed.items?.item)[0];
  if (!item) {
    throw new BggNotFoundError(bggId);
  }

  return mapItem(item);
}

/** Suchergebnisse ändern sich mit neuen BGG-Einträgen — kürzer cachen als Detaildaten. */
const SEARCH_REVALIDATE_SECONDS = 60 * 60;

/**
 * BGG sortiert Suchergebnisse nicht nach Relevanz zum eingegebenen Text —
 * ein exakter Treffer wie "Catan" kann hinter langen Titeln landen, die den
 * Suchbegriff nur als Teilstring enthalten (z. B. Erweiterungen/Varianten).
 * Rang 0 = exakter Treffer, 1 = beginnt damit, 2 = alles andere; je Rang
 * gewinnt der kürzere Titel — je weniger "Rauschen" um den Treffer, desto
 * wahrscheinlicher ist es das gesuchte Spiel.
 */
function titleMatchRank(title: string, query: string): number {
  const normalisedTitle = title.trim().toLowerCase();
  const normalisedQuery = query.trim().toLowerCase();
  if (normalisedTitle === normalisedQuery) return 0;
  if (normalisedTitle.startsWith(normalisedQuery)) return 1;
  return 2;
}

export async function searchBggGames(
  query: string,
): Promise<BggSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const xml = await fetchBggXml(
    `/search?query=${encodeURIComponent(trimmed)}&type=boardgame`,
    SEARCH_REVALIDATE_SECONDS,
  );
  const parsed = parser.parse(xml) as BggSearchResponse;

  const results = toArray(parsed.items?.item)
    .map((item) => {
      const bggId = parseNumber(item.id);
      const names = toArray(item.name);
      const primaryName =
        names.find((name) => name.type === "primary") ?? names[0];
      if (bggId === null || !primaryName?.value) return null;
      return {
        bggId,
        title: primaryName.value,
        yearPublished: parseNumber(item.yearpublished?.value),
      };
    })
    .filter((result): result is BggSearchResult => result !== null);

  return results.sort(
    (a, b) =>
      titleMatchRank(a.title, trimmed) - titleMatchRank(b.title, trimmed) ||
      a.title.length - b.title.length,
  );
}

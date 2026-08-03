import { XMLParser } from "fast-xml-parser";

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
    item?: BggItem;
  };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  htmlEntities: true,
  isArray: (name, _jpath, _isLeafNode, isAttribute) =>
    !isAttribute && (name === "name" || name === "link" || name === "video"),
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

export async function fetchBggGame(bggId: number): Promise<BggGameData> {
  let response: Response;
  try {
    response = await fetch(
      `${BGG_API_BASE}/thing?id=${bggId}&stats=1&videos=1`,
      {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: REVALIDATE_SECONDS },
      },
    );
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

  const xml = await response.text();
  const parsed = parser.parse(xml) as BggThingResponse;
  const item = parsed.items?.item;
  if (!item) {
    throw new BggNotFoundError(bggId);
  }

  return mapItem(item);
}

import { XMLParser } from "fast-xml-parser";
import { requireEnv } from "@/lib/utils/require-env";
import { decodeHtmlEntities } from "@/lib/utils/decode-html-entities";

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
  /** Alle `name type="alternate"`-Einträge, ungefiltert — Grundlage für die
   * automatische Befüllung der Alternativnamen-Liste beim Import (#187).
   * BGG liefert hier z. B. deutsche Titel neben dem meist englischen
   * `primary`-Namen. */
  alternateNames: string[];
  /** Erstes deutsches, sonst erstes englisches instruktives YouTube-Video —
   * nur diese beiden Sprachen gelten als Fallback, alles andere wird
   * ignoriert (#185-Folgeanfrage: "Nur Deutsche und Englische Videos"). Beim
   * automatischen Import wird die URL direkt übernommen; im "Video
   * aktualisieren"-Dialog stehen dieselben Kandidaten mit Titel/Kanal über
   * `germanExplainerVideos`/`englishExplainerVideos` zur Verfügung, damit der
   * Admin auch dort aktiv auswählt statt sie stillschweigend übernommen zu
   * bekommen (#185-Folge). */
  explainerVideoUrl: string | null;
  /** Alle instruktiven YouTube-Videos mit `language="German"` im (auf die
   * ~15 aktuellsten Einträge begrenzten) BGG-Videofenster — Grundlage für
   * die Auswahlliste im Import-Dialog, siehe `selectGermanExplainerVideos()` (#185). */
  germanExplainerVideos: BggExplainerVideo[];
  /** Alle instruktiven YouTube-Videos ohne Sprachangabe oder mit
   * `language="English"` — Grundlage für die Fallback-Auswahlliste im "Video
   * aktualisieren"-Dialog, wenn kein deutschsprachiger Treffer existiert.
   * Andere Sprachen werden bewusst nicht angezeigt (#185-Folgeanfrage). */
  englishExplainerVideos: BggExplainerVideo[];
}

export interface BggExplainerVideo {
  title: string;
  url: string;
  channel: string;
  /** Nur für YouTube-Suchtreffer bekannt (#185-Folgeanfrage) — BGG liefert
   * keine Abonnentenzahlen. In der Auswahlliste zeigt ein fehlender Wert
   * dementsprechend "–" statt einer Zahl. */
  subscriberCount?: number;
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
  title?: string;
  category?: string;
  link?: string;
  username?: string;
  /** Ausgeschrieben, z. B. "German", "English" — trotz ursprünglicher Annahme
   * liefert BGG das doch mit, siehe #185. */
  language?: string;
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

/**
 * Alle instruktiven YouTube-Videos im gelieferten Videofenster, deren Sprache
 * `predicate` erfüllt (#185). BEKANNTE GRENZE: der `thing`-Endpunkt liefert im
 * `videos`-Block nur ein festes Fenster der ~15 aktuellsten Videos, auch wenn
 * `<videos total>` mehr meldet — ein existierendes Video außerhalb dieses
 * Fensters wird nicht gefunden. Das ist eine BGG-API-Einschränkung, keine
 * Regression: die Website selbst filtert Sprache nur clientseitig/serverseitig
 * auf einer eigenen, nicht über die XML-API erreichbaren Route.
 */
function selectExplainerVideosByLanguage(
  videos: BggItem["videos"],
  predicate: (language: string | undefined) => boolean,
): BggExplainerVideo[] {
  return toArray(videos?.video)
    .filter(
      (video): video is BggVideoEntry & { link: string } =>
        video.category === "instructional" &&
        predicate(video.language) &&
        video.link !== undefined &&
        isYoutubeLink(video.link),
    )
    .map((video) => ({
      title: video.title ?? "",
      url: video.link,
      channel: video.username ?? "",
    }));
}

function selectGermanExplainerVideos(
  videos: BggItem["videos"],
): BggExplainerVideo[] {
  return selectExplainerVideosByLanguage(
    videos,
    (language) => language === "German",
  );
}

/** Videos ohne Sprachangabe gelten als Englisch — BGG setzt das Attribut nur
 * für nicht-englische Videos, viele ältere/englische Einträge tragen daher
 * gar kein `language`-Attribut (#185-Folgeanfrage). */
function selectEnglishExplainerVideos(
  videos: BggItem["videos"],
): BggExplainerVideo[] {
  return selectExplainerVideosByLanguage(
    videos,
    (language) => language === undefined || language === "English",
  );
}

function mapItem(item: BggItem): BggGameData {
  const names = toArray(item.name);
  const primaryName = names.find((name) => name.type === "primary") ?? names[0];
  const alternateNames = names
    .filter((name) => name.type === "alternate")
    .map((name) => decodeHtmlEntities(name.value));

  const mechanics = toArray(item.link)
    .filter((link) => link.type === "boardgamemechanic")
    .map((link) => link.value);

  const rawWeight = parseNumber(item.statistics?.ratings?.averageweight?.value);
  const germanExplainerVideos = selectGermanExplainerVideos(item.videos);
  const englishExplainerVideos = selectEnglishExplainerVideos(item.videos);

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
    alternateNames,
    explainerVideoUrl:
      germanExplainerVideos[0]?.url ?? englishExplainerVideos[0]?.url ?? null,
    germanExplainerVideos,
    englishExplainerVideos,
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

async function searchBggGamesInternal(
  query: string,
  { exact = false }: { exact?: boolean } = {},
): Promise<BggSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const exactParam = exact ? "&exact=1" : "";
  const xml = await fetchBggXml(
    `/search?query=${encodeURIComponent(trimmed)}&type=boardgame${exactParam}`,
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

export async function searchBggGames(
  query: string,
): Promise<BggSearchResult[]> {
  return searchBggGamesInternal(query);
}

/**
 * Exakte Namenssuche für den Massenimport (#186) — BGGs `exact=1`-Parameter
 * liefert nur Titel, die dem Suchbegriff exakt entsprechen (case-insensitiv),
 * statt jeder Fundstelle mit dem Begriff als Teilstring. Genau ein Treffer
 * gilt als eindeutig auflösbar und wird automatisch importiert; alles andere
 * (0 oder >1 Treffer) landet in der Review-Liste.
 */
export async function searchBggGamesExact(
  query: string,
): Promise<BggSearchResult[]> {
  return searchBggGamesInternal(query, { exact: true });
}

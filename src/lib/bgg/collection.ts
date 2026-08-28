import {
  fetchBggXml,
  parser,
  parseNumber,
  SEARCH_REVALIDATE_SECONDS,
  toArray,
} from "@/lib/bgg/client";

export class BggCollectionUnavailableError extends Error {
  constructor(username: string) {
    super(
      `BGG-Collection für "${username}" ist nicht abrufbar — Profil ist privat, existiert nicht, oder BGG verarbeitet die Anfrage noch (bitte gleich erneut versuchen).`,
    );
    this.name = "BggCollectionUnavailableError";
  }
}

export interface BggCollectionEntry {
  bggId: number;
  title: string;
  /** Persönliche Bewertung dieses Meeples, `null` unbewertet (nur mit `stats=1` verfügbar). */
  rating: number | null;
  /** Nur die zwei Stati, die die Übersicht anzeigt — andere werden ignoriert. */
  forTrade: boolean;
  wantToPlay: boolean;
  /** BGG liefert hier bereits die kleinere Vorschau-Variante des Covers. */
  imageUrl: string | null;
}

interface BggCollectionItem {
  objectid?: string;
  name?: { "#text"?: string } | { "#text"?: string }[];
  status?: { own?: string; fortrade?: string; wanttoplay?: string };
  stats?: { rating?: { value?: string } };
  image?: string;
  thumbnail?: string;
}

interface BggCollectionResponse {
  items?: { item?: BggCollectionItem | BggCollectionItem[] };
  /** BGG antwortet mit diesem Block statt `items` bei ungültigem Username;
   * ein privates Profil liefert stattdessen `items totalitems="0"` ohne
   * erkennbaren Unterschied zu einer leeren, aber öffentlichen Collection —
   * beides landet für den Aufrufer im selben "leere Liste"-Fall. */
  errors?: { error?: { message?: string } };
}

/**
 * Öffentliche BGG-Collection eines Benutzernamens (#255) — nur besessene
 * Titel (`own=1`), keine Wunschlisten/geliehenen Einträge; zusätzlich
 * client-seitig auf `status.own === "1"` gefiltert, da `own=1` nur ein
 * Server-seitiger Filter-Hinweis ist. `stats=1` liefert die persönliche
 * Bewertung mit.
 */
export async function fetchBggCollection(
  username: string,
): Promise<BggCollectionEntry[]> {
  const trimmed = username.trim();
  if (!trimmed) return [];

  const xml = await fetchBggXml(
    `/collection?username=${encodeURIComponent(trimmed)}&own=1&stats=1&excludesubtype=boardgameexpansion`,
    SEARCH_REVALIDATE_SECONDS,
  );
  const parsed = parser.parse(xml) as BggCollectionResponse;

  if (parsed.errors) {
    throw new BggCollectionUnavailableError(trimmed);
  }

  return toArray(parsed.items?.item)
    .map((item) => {
      const bggId = parseNumber(item.objectid);
      const title = toArray(item.name)[0]?.["#text"];
      if (bggId === null || !title) return null;
      if (item.status?.own !== "1") return null;
      return {
        bggId,
        title,
        rating: parseNumber(item.stats?.rating?.value),
        forTrade: item.status?.fortrade === "1",
        wantToPlay: item.status?.wanttoplay === "1",
        imageUrl: item.image ?? item.thumbnail ?? null,
      };
    })
    .filter((entry): entry is BggCollectionEntry => entry !== null);
}

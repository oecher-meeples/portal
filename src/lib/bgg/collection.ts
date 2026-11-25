import {
  fetchBggXml,
  parser,
  parseNumber,
  parseVersions,
  toArray,
} from "@/lib/bgg/client";
import { sleep } from "@/lib/utils/sleep";
import type { BggItem, BggVersion } from "@/lib/bgg/client";

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
  /** Nur der Status, den die Übersicht anzeigt — andere werden ignoriert. */
  forTrade: boolean;
  /** BGG liefert hier bereits die kleinere Vorschau-Variante des Covers. */
  imageUrl: string | null;
  /** Die auf BGG hinterlegte Version dieses Exemplars (`version=1`), `null`
   * wenn der Meeple keine gewählt hat. */
  version: BggVersion | null;
}

/** Titel einer „Want to Play"-Abfrage (#637) — bewusst nur Stub-Daten, ohne
 * Besitz-Felder wie Version oder persönliche Bewertung. */
export interface BggWantToPlayEntry {
  bggId: number;
  title: string;
  imageUrl: string | null;
  yearPublished: number | null;
  /** BGGs Community-Durchschnittsbewertung (`stats.rating.average`). */
  averageRating: number | null;
}

interface BggCollectionItem {
  objectid?: string;
  name?: { "#text"?: string } | { "#text"?: string }[];
  yearpublished?: string | number;
  status?: { own?: string; fortrade?: string; wanttoplay?: string };
  stats?: { rating?: { value?: string; average?: { value?: string } } };
  image?: string;
  thumbnail?: string;
  /** Gleiche Struktur wie `versions` bei `thing?versions=1`, höchstens ein Item. */
  version?: BggItem["versions"];
}

interface BggCollectionResponse {
  items?: { item?: BggCollectionItem | BggCollectionItem[] };
  /** BGG antwortet mit diesem Block statt `items` bei ungültigem Username;
   * ein privates Profil liefert stattdessen `items totalitems="0"` ohne
   * erkennbaren Unterschied zu einer leeren, aber öffentlichen Collection —
   * beides landet für den Aufrufer im selben "leere Liste"-Fall. */
  errors?: { error?: { message?: string } };
  /** BGG antwortet mit HTTP 202 und nur diesem Hinweis, solange es die
   * Collection erst zusammenstellt — ohne `items`. */
  message?: string;
}

/** Wartezeit und Versuche, bis BGG eine zusammengestellte Collection liefert. */
const QUEUED_RETRY_DELAY_MS = 3000;
const QUEUED_MAX_ATTEMPTS = 6;

/** Eine Collection-Abfrage samt Fehlerbehandlung; liefert die rohen Items
 * mit gültiger BGG-ID und Titel. */
async function fetchCollectionItems(
  username: string,
  query: string,
): Promise<(BggCollectionItem & { bggId: number; title: string })[]> {
  // Nie cachen: Eine „wird zusammengestellt"-Antwort (202, leer) würde sonst
  // eine Stunde lang als leere Collection ausgeliefert — der Import meldete
  // dann 0 Titel (#637).
  let parsed: BggCollectionResponse = {};
  for (let attempt = 1; attempt <= QUEUED_MAX_ATTEMPTS; attempt++) {
    const xml = await fetchBggXml(
      `/collection?username=${encodeURIComponent(username)}&${query}`,
      0,
    );
    parsed = parser.parse(xml) as BggCollectionResponse;
    if (parsed.items || parsed.errors || !parsed.message) break;
    if (attempt === QUEUED_MAX_ATTEMPTS) {
      throw new BggCollectionUnavailableError(username);
    }
    await sleep(QUEUED_RETRY_DELAY_MS);
  }

  if (parsed.errors) {
    throw new BggCollectionUnavailableError(username);
  }

  return toArray(parsed.items?.item).flatMap((item) => {
    const bggId = parseNumber(item.objectid);
    const title = toArray(item.name)[0]?.["#text"];
    return bggId === null || !title ? [] : [{ ...item, bggId, title }];
  });
}

/**
 * BGG liefert eine Collection-Zeile pro **Exemplar**, nicht pro Spiel: Wer
 * dasselbe Spiel zweimal oder in zwei Editionen besitzt, hat zwei Items mit
 * gleicher `objectid`. Der private Bestand führt aber nur einen Eintrag pro
 * Titel (Unique `meepleId + boardGameId`), daher hier zusammenführen: die
 * erste Zeile mit gewählter Version gewinnt, `rating` kommt aus der ersten
 * bewerteten Zeile, `forTrade` gilt, sobald ein Exemplar tauschbar ist.
 */
function mergeByBggId(entries: BggCollectionEntry[]): BggCollectionEntry[] {
  const merged = new Map<number, BggCollectionEntry>();
  for (const entry of entries) {
    const existing = merged.get(entry.bggId);
    if (!existing) {
      merged.set(entry.bggId, entry);
      continue;
    }
    merged.set(entry.bggId, {
      ...existing,
      rating: existing.rating ?? entry.rating,
      forTrade: existing.forTrade || entry.forTrade,
      imageUrl: existing.imageUrl ?? entry.imageUrl,
      version: existing.version ?? entry.version,
    });
  }
  return [...merged.values()];
}

/**
 * Öffentliche BGG-Collection eines Benutzernamens (#255) — nur besessene
 * Titel (`own=1`), keine Wunschlisten/geliehenen Einträge; zusätzlich
 * client-seitig auf `status.own === "1"` gefiltert, da `own=1` nur ein
 * Server-seitiger Filter-Hinweis ist. `stats=1` liefert die persönliche
 * Bewertung mit, `version=1` die vom Meeple gewählte Version.
 */
export async function fetchBggCollection(
  username: string,
): Promise<BggCollectionEntry[]> {
  const trimmed = username.trim();
  if (!trimmed) return [];

  const items = await fetchCollectionItems(
    trimmed,
    "own=1&stats=1&version=1&excludesubtype=boardgameexpansion",
  );
  return mergeByBggId(
    items
      .filter((item) => item.status?.own === "1")
      .map((item) => ({
        bggId: item.bggId,
        title: item.title,
        rating: parseNumber(item.stats?.rating?.value),
        forTrade: item.status?.fortrade === "1",
        imageUrl: item.image ?? item.thumbnail ?? null,
        version:
          parseVersions(item.version).find((v) => v.bggVersionId !== null) ??
          null,
      })),
  );
}

/**
 * „Want to Play"-Liste eines Benutzernamens (#637), **ohne** `own`-Filter —
 * auch Titel ohne Besitz. `wishlist`/`want to buy` bleiben außen vor; wie bei
 * `own=1` filtert zusätzlich der Client auf `status.wanttoplay === "1"`.
 */
export async function fetchBggWantToPlay(
  username: string,
): Promise<BggWantToPlayEntry[]> {
  const trimmed = username.trim();
  if (!trimmed) return [];

  const items = await fetchCollectionItems(
    trimmed,
    "wanttoplay=1&stats=1&excludesubtype=boardgameexpansion",
  );
  return items
    .filter((item) => item.status?.wanttoplay === "1")
    .map((item) => ({
      bggId: item.bggId,
      title: item.title,
      imageUrl: item.image ?? item.thumbnail ?? null,
      yearPublished: parseNumber(
        item.yearpublished === undefined
          ? undefined
          : String(item.yearpublished),
      ),
      averageRating: parseNumber(item.stats?.rating?.average?.value),
    }));
}

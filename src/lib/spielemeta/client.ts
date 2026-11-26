import { isValidEan, normaliseEan } from "@/lib/inventory/ean";
import { requireEnv } from "@/lib/utils/require-env";
import type { EanSearchResult } from "@/lib/upc-lookup/client";

export class SpielemetaError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SpielemetaError";
    this.status = status;
  }
}

const DEFAULT_BASE_URL = "https://spielemeta.rodnoc.dev";
const REQUEST_TIMEOUT_MS = 8000;
const SEARCH_LIMIT = 25;
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 255;

/** Feldnamen der API sind großgeschrieben; `PARENTEAN` wird bewusst ignoriert (#668). */
interface SpielemetaGame {
  EAN?: string | null;
  NAME?: string | null;
  YEAR?: number | string | null;
  VERLAG?: string | null;
  HERAUSGEBER?: string | null;
}

function baseUrl() {
  return (process.env.SPIELEMETA_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
}

async function fetchSpielemeta(path: string, params: URLSearchParams) {
  const apiKey = requireEnv("EAN_API_KEY");
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new SpielemetaError(
        "Die Anfrage an die Spielemeta-API hat zu lange gedauert.",
      );
    }
    throw new SpielemetaError("Die Spielemeta-API ist nicht erreichbar.");
  }

  if (!response.ok) {
    throw new SpielemetaError(
      `Spielemeta-Anfrage fehlgeschlagen (${response.status}).`,
      response.status,
    );
  }

  try {
    return (await response.json()) as unknown;
  } catch {
    throw new SpielemetaError("Ungültige Antwort der Spielemeta-API.");
  }
}

function toResult(game: SpielemetaGame): EanSearchResult | null {
  const ean = normaliseEan(String(game.EAN ?? ""));
  const title = game.NAME?.trim();
  if (!title || !isValidEan(ean)) return null;

  const year = Number(game.YEAR);
  return {
    ean,
    title,
    brand: game.VERLAG?.trim() || game.HERAUSGEBER?.trim() || undefined,
    ...(Number.isInteger(year) && year > 0 ? { year } : {}),
  };
}

/** Titelsuche (erste Seite); Namen außerhalb von 3–255 Zeichen würden `400` auslösen und liefern leer. */
export async function searchGamesByName(
  name: string,
): Promise<EanSearchResult[]> {
  const trimmed = name.trim();
  if (trimmed.length < MIN_NAME_LENGTH) return [];

  const json = (await fetchSpielemeta(
    "/api/v1/search/games",
    new URLSearchParams({
      name: trimmed.slice(0, MAX_NAME_LENGTH),
      limit: String(SEARCH_LIMIT),
      offset: "0",
    }),
  )) as { games?: SpielemetaGame[] } | null;

  const seen = new Set<string>();
  const results: EanSearchResult[] = [];
  for (const game of json?.games ?? []) {
    const result = toResult(game);
    if (!result || seen.has(result.ean)) continue;
    seen.add(result.ean);
    results.push(result);
  }
  return results;
}

/** Direkter EAN-Lookup; unbekannte EANs liefern HTTP 200 mit dem nackten `false`. */
export async function lookupGameByEan(
  ean: string,
): Promise<EanSearchResult | null> {
  const json = await fetchSpielemeta(
    "/api/v1/search/game",
    new URLSearchParams({ ean: normaliseEan(ean) }),
  );
  if (!json || typeof json !== "object") return null;
  return toResult(json as SpielemetaGame);
}

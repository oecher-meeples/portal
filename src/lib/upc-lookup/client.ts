export class UpcLookupError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UpcLookupError";
    this.status = status;
  }
}

export interface EanSearchResult {
  ean: string;
  title: string;
  brand?: string;
}

const UPC_ITEM_DB_SEARCH_URL = "https://api.upcitemdb.com/prod/trial/search";
const SEARCH_TIMEOUT_MS = 8000;

interface UpcItemDbSearchItem {
  ean?: string;
  upc?: string;
  title?: string;
  brand?: string;
}

/**
 * Sucht eine EAN zu einem Spieletitel (#197) — keine kostenlose API mit
 * zuverlässiger Namenssuche für Brettspiele gefunden (EAN-Search.org ist
 * kostenpflichtig ab dem ersten Monat, siehe Recherche zu #197). UPCitemdb's
 * Trial-Tier ist echt kostenlos und braucht keinen Key/Signup, ist aber ein
 * US-lastiger Retail-Scrape-Katalog — die Trefferqualität für (insbesondere
 * deutsche) Brettspiele ist deshalb ein Best-Effort, kein verlässlicher
 * Volltreffer. Genau dafür sieht die UI 0/1/>1-Treffer-Fälle vor, statt
 * blind den ersten Treffer zu übernehmen.
 */
export async function searchEanByName(
  query: string,
): Promise<EanSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const params = new URLSearchParams({
    s: trimmed,
    match_mode: "0",
    type: "product",
  });

  let response: Response;
  try {
    response = await fetch(`${UPC_ITEM_DB_SEARCH_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new UpcLookupError(
        "Die Anfrage an die EAN-Suche hat zu lange gedauert.",
      );
    }
    throw error;
  }

  if (!response.ok) {
    throw new UpcLookupError(
      `EAN-Suche fehlgeschlagen (${response.status}).`,
      response.status,
    );
  }

  const json = (await response.json()) as { items?: UpcItemDbSearchItem[] };
  const seen = new Set<string>();

  return (json.items ?? [])
    .map((item) => ({
      ean: item.ean ?? item.upc ?? "",
      title: item.title ?? "",
      brand: item.brand,
    }))
    .filter((item) => {
      if (!item.ean || seen.has(item.ean)) return false;
      seen.add(item.ean);
      return true;
    });
}

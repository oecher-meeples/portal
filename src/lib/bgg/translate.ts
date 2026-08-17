export class TranslationApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "TranslationApiError";
    this.status = status;
  }
}

const MYMEMORY_API_BASE = "https://api.mymemory.translated.net/get";
const TRANSLATE_TIMEOUT_MS = 8000;

/**
 * Übersetzt englischen Fließtext (die BGG-Beschreibung) ins Deutsche via die
 * kostenlose MyMemory-API (#184) — kein API-Key, keine Kreditkarte, kein
 * Abrechnungskonto überhaupt. Recherche zu Alternativen: DeepL Free lässt
 * sich seit Kurzem nicht mehr neu abschließen (nur noch Pro/Growth), Azure-
 * und Google-Translate verlangen beide eine Kreditkarte schon bei der
 * Anmeldung zum jeweiligen Free-Tier (Google bucht dazu automatisch über die
 * Freigrenze hinaus ab). MyMemory hat strukturell kein Abrechnungsmodell —
 * schlimmstenfalls schlägt eine Anfrage fehl, es kann nie eine Rechnung
 * entstehen. `TRANSLATION_CONTACT_EMAIL` ist optional (keine Registrierung,
 * nur ein Query-Param) und hebt das Tageslimit von 5.000 auf 50.000 Zeichen.
 *
 * Mechaniken sind kurze Fachbegriffe und laufen über die feste Tabelle in
 * `lib/ludothek/mechanics-translations.ts`, nicht über eine Live-Übersetzung.
 */
export async function translateToGerman(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const params = new URLSearchParams({ q: trimmed, langpair: "en|de" });
  const contactEmail = process.env.TRANSLATION_CONTACT_EMAIL;
  if (contactEmail) {
    params.set("de", contactEmail);
  }

  let response: Response;
  try {
    response = await fetch(`${MYMEMORY_API_BASE}?${params.toString()}`, {
      signal: AbortSignal.timeout(TRANSLATE_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new TranslationApiError(
        "Die Anfrage an den Übersetzungsdienst hat zu lange gedauert.",
      );
    }
    throw error;
  }

  if (!response.ok) {
    throw new TranslationApiError(
      `Übersetzungs-API-Anfrage fehlgeschlagen (${response.status}).`,
      response.status,
    );
  }

  const json = (await response.json()) as {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
  };

  // MyMemory signalisiert eine ausgeschöpfte Tagesquote nur im JSON-Body
  // (responseStatus), nicht immer über den HTTP-Statuscode.
  if (Number(json.responseStatus) !== 200) {
    throw new TranslationApiError(
      `MyMemory-Übersetzung fehlgeschlagen (Status ${json.responseStatus}).`,
    );
  }

  return json.responseData?.translatedText ?? text;
}

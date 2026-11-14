/** BGG-Sprachname (`link type="language"`) → ISO-3166-Ländercode der Flagge. */
const COUNTRY_BY_BGG_LANGUAGE: Record<string, string> = {
  english: "GB",
  french: "FR",
  italian: "IT",
  spanish: "ES",
  catalan: "ES",
  portuguese: "PT",
  dutch: "NL",
  polish: "PL",
  czech: "CZ",
  slovak: "SK",
  hungarian: "HU",
  romanian: "RO",
  bulgarian: "BG",
  russian: "RU",
  ukrainian: "UA",
  swedish: "SE",
  danish: "DK",
  norwegian: "NO",
  finnish: "FI",
  greek: "GR",
  turkish: "TR",
  chinese: "CN",
  japanese: "JP",
  korean: "KR",
  croatian: "HR",
  serbian: "RS",
  slovenian: "SI",
  lithuanian: "LT",
  latvian: "LV",
  estonian: "EE",
  hebrew: "IL",
  thai: "TH",
  vietnamese: "VN",
};

function isGerman(language: string): boolean {
  return /german|deutsch/i.test(language);
}

/** Ländercode der Flagge hinter dem Titel — nur für Editionen, die nicht
 * deutsch sind. `null` bei deutscher oder unbekannter Edition und bei
 * Sprachen ohne Zuordnung: lieber keine Flagge als eine falsche. */
export function editionFlagCountry(languages: string[]): string | null {
  if (languages.length === 0 || languages.some(isGerman)) return null;
  for (const language of languages) {
    const country = COUNTRY_BY_BGG_LANGUAGE[language.trim().toLowerCase()];
    if (country) return country;
  }
  return null;
}

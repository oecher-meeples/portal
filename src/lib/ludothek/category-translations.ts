/**
 * Deutsche Labels für BGG-Category-Fachbegriffe (#404) — analog
 * `mechanics-translations.ts`: feste Tabelle statt Live-Übersetzung, da es
 * sich um wiederkehrende, kurze Fachbegriffe handelt. Kein Eintrag → Fallback
 * auf den Original-Begriff (z. B. bereits als Anglizismus etablierte Namen).
 */
const CATEGORY_TRANSLATIONS: Record<string, string> = {
  "Party Game": "Partyspiel",
  "Family Game": "Familienspiel",
  "Strategy Game": "Strategiespiel",
  "Card Game": "Kartenspiel",
  "Abstract Strategy": "Abstraktes Strategiespiel",
  Adventure: "Abenteuer",
  Fantasy: "Fantasy",
  "Science Fiction": "Science-Fiction",
  Fighting: "Kampf",
  Wargame: "Kriegsspiel",
  Economic: "Wirtschaft",
  Negotiation: "Verhandlung",
  Deduction: "Deduktion",
  Puzzle: "Knobelspiel",
  Dice: "Würfelspiel",
  "Word Game": "Wortspiel",
  Trivia: "Wissensspiel",
  Animals: "Tiere",
  Horror: "Horror",
  Humor: "Humor",
  Medieval: "Mittelalter",
  Miniatures: "Miniaturen",
  "Movies / TV / Radio theme": "Film-/TV-/Radio-Thema",
  Mythology: "Mythologie",
  Nautical: "Nautisch",
  Pirates: "Piraten",
  Racing: "Rennen",
  "Real-time": "Echtzeit",
  Religious: "Religiös",
  Renaissance: "Renaissance",
  "Spies/Secret Agents": "Spione/Geheimagenten",
  Sports: "Sport",
  "Territory Building": "Gebietsaufbau",
  Transportation: "Transport",
  Travel: "Reisen",
  "Video Game Theme": "Videospiel-Thema",
  "American West": "Amerikanischer Westen",
  Ancient: "Antike",
  "City Building": "Stadtaufbau",
  Civilization: "Zivilisation",
  Environmental: "Umwelt",
  Exploration: "Erkundung",
  "Industry / Manufacturing": "Industrie/Fertigung",
  Math: "Mathematik",
  "Space Exploration": "Weltraumforschung",
  Zombies: "Zombies",
  "Children's Game": "Kinderspiel",
  Educational: "Lernspiel",
  Bluffing: "Bluffen",
  "Murder/Mystery": "Mord/Mystery",
  Prehistoric: "Prähistorisch",
};

/** Fällt auf den Original-Begriff zurück, wenn keine Übersetzung hinterlegt ist. */
export function translateCategory(category: string): string {
  return CATEGORY_TRANSLATIONS[category] ?? category;
}

export function translateCategories(categories: string[]): string[] {
  return categories.map(translateCategory);
}

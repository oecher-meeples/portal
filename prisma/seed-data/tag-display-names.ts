import type { TagType } from "@prisma/client";

/**
 * Deutsche Anzeigenamen für BGG-Mechaniken und -Kategorien (Epic #490
 * Strang B) — übernommen aus den früheren festen Übersetzungstabellen
 * (#184, #404). Produktiv-Konfiguration, kein Demo-Content: `seedTagDisplayNames`
 * legt die Tags vorab an und setzt `displayName` nur, solange er leer ist,
 * damit Admin-Änderungen einen erneuten Seed überstehen. Begriffe, die in der
 * deutschen Szene als Anglizismus etabliert sind (z. B. "Deckbuilding"),
 * fehlen bewusst — die Anzeige fällt dann auf den BGG-Namen zurück.
 */
export const TAG_DISPLAY_NAMES: {
  type: TagType;
  name: string;
  displayName: string;
}[] = [
  {
    type: "MECHANIC",
    name: "Worker Placement",
    displayName: "Arbeitereinsatz",
  },
  {
    type: "MECHANIC",
    name: "Hand Management",
    displayName: "Handkartenmanagement",
  },
  { type: "MECHANIC", name: "Dice Rolling", displayName: "Würfelglück" },
  {
    type: "MECHANIC",
    name: "Tile Placement",
    displayName: "Plättchen platzieren",
  },
  { type: "MECHANIC", name: "Cooperative Game", displayName: "Kooperativ" },
  { type: "MECHANIC", name: "Action Points", displayName: "Aktionspunkte" },
  {
    type: "MECHANIC",
    name: "Route/Network Building",
    displayName: "Streckenbau",
  },
  {
    type: "MECHANIC",
    name: "Network and Route Building",
    displayName: "Streckenbau",
  },
  { type: "MECHANIC", name: "Auction/Bidding", displayName: "Versteigerung" },
  {
    type: "MECHANIC",
    name: "Simultaneous Action Selection",
    displayName: "Gleichzeitige Aktionswahl",
  },
  { type: "MECHANIC", name: "Trading", displayName: "Handel" },
  { type: "MECHANIC", name: "Push Your Luck", displayName: "Risikomanagement" },
  {
    type: "MECHANIC",
    name: "Roll / Spin and Move",
    displayName: "Würfeln und Ziehen",
  },
  {
    type: "MECHANIC",
    name: "Point to Point Movement",
    displayName: "Bewegung entlang von Punkten",
  },
  {
    type: "MECHANIC",
    name: "Grid Movement",
    displayName: "Bewegung auf Gitterfeld",
  },
  { type: "MECHANIC", name: "Memory", displayName: "Merkfähigkeit" },
  { type: "MECHANIC", name: "Pattern Building", displayName: "Musterbildung" },
  {
    type: "MECHANIC",
    name: "Modular Board",
    displayName: "Modularer Spielplan",
  },
  { type: "MECHANIC", name: "Card Drafting", displayName: "Drafting" },
  {
    type: "MECHANIC",
    name: "Storytelling",
    displayName: "Geschichten erzählen",
  },
  { type: "MECHANIC", name: "Voting", displayName: "Abstimmung" },
  { type: "MECHANIC", name: "Negotiation", displayName: "Verhandlung" },
  { type: "MECHANIC", name: "Team-Based Game", displayName: "Teamspiel" },
  {
    type: "MECHANIC",
    name: "Player Elimination",
    displayName: "Spielerausscheidung",
  },
  { type: "MECHANIC", name: "Legacy Game", displayName: "Legacy-Spiel" },
  { type: "MECHANIC", name: "Solo / Solitaire Game", displayName: "Solospiel" },
  { type: "MECHANIC", name: "Hidden Roles", displayName: "Verdeckte Rollen" },
  {
    type: "MECHANIC",
    name: "Variable Player Powers",
    displayName: "Variable Spielerfähigkeiten",
  },
  {
    type: "MECHANIC",
    name: "Area Majority / Influence",
    displayName: "Gebietskontrolle",
  },
  {
    type: "MECHANIC",
    name: "Area Control / Area Influence",
    displayName: "Gebietskontrolle",
  },
  { type: "MECHANIC", name: "Zone of Control", displayName: "Kontrollzonen" },
  { type: "MECHANIC", name: "Bluffing", displayName: "Bluffen" },
  { type: "CATEGORY", name: "Party Game", displayName: "Partyspiel" },
  { type: "CATEGORY", name: "Family Game", displayName: "Familienspiel" },
  { type: "CATEGORY", name: "Strategy Game", displayName: "Strategiespiel" },
  { type: "CATEGORY", name: "Card Game", displayName: "Kartenspiel" },
  {
    type: "CATEGORY",
    name: "Abstract Strategy",
    displayName: "Abstraktes Strategiespiel",
  },
  { type: "CATEGORY", name: "Adventure", displayName: "Abenteuer" },
  { type: "CATEGORY", name: "Science Fiction", displayName: "Science-Fiction" },
  { type: "CATEGORY", name: "Fighting", displayName: "Kampf" },
  { type: "CATEGORY", name: "Wargame", displayName: "Kriegsspiel" },
  { type: "CATEGORY", name: "Economic", displayName: "Wirtschaft" },
  { type: "CATEGORY", name: "Negotiation", displayName: "Verhandlung" },
  { type: "CATEGORY", name: "Deduction", displayName: "Deduktion" },
  { type: "CATEGORY", name: "Puzzle", displayName: "Knobelspiel" },
  { type: "CATEGORY", name: "Dice", displayName: "Würfelspiel" },
  { type: "CATEGORY", name: "Word Game", displayName: "Wortspiel" },
  { type: "CATEGORY", name: "Trivia", displayName: "Wissensspiel" },
  { type: "CATEGORY", name: "Animals", displayName: "Tiere" },
  { type: "CATEGORY", name: "Medieval", displayName: "Mittelalter" },
  { type: "CATEGORY", name: "Miniatures", displayName: "Miniaturen" },
  {
    type: "CATEGORY",
    name: "Movies / TV / Radio theme",
    displayName: "Film-/TV-/Radio-Thema",
  },
  { type: "CATEGORY", name: "Mythology", displayName: "Mythologie" },
  { type: "CATEGORY", name: "Nautical", displayName: "Nautisch" },
  { type: "CATEGORY", name: "Pirates", displayName: "Piraten" },
  { type: "CATEGORY", name: "Racing", displayName: "Rennen" },
  { type: "CATEGORY", name: "Real-time", displayName: "Echtzeit" },
  { type: "CATEGORY", name: "Religious", displayName: "Religiös" },
  {
    type: "CATEGORY",
    name: "Spies/Secret Agents",
    displayName: "Spione/Geheimagenten",
  },
  { type: "CATEGORY", name: "Sports", displayName: "Sport" },
  {
    type: "CATEGORY",
    name: "Territory Building",
    displayName: "Gebietsaufbau",
  },
  { type: "CATEGORY", name: "Transportation", displayName: "Transport" },
  { type: "CATEGORY", name: "Travel", displayName: "Reisen" },
  {
    type: "CATEGORY",
    name: "Video Game Theme",
    displayName: "Videospiel-Thema",
  },
  {
    type: "CATEGORY",
    name: "American West",
    displayName: "Amerikanischer Westen",
  },
  { type: "CATEGORY", name: "Ancient", displayName: "Antike" },
  { type: "CATEGORY", name: "City Building", displayName: "Stadtaufbau" },
  { type: "CATEGORY", name: "Civilization", displayName: "Zivilisation" },
  { type: "CATEGORY", name: "Environmental", displayName: "Umwelt" },
  { type: "CATEGORY", name: "Exploration", displayName: "Erkundung" },
  {
    type: "CATEGORY",
    name: "Industry / Manufacturing",
    displayName: "Industrie/Fertigung",
  },
  { type: "CATEGORY", name: "Math", displayName: "Mathematik" },
  {
    type: "CATEGORY",
    name: "Space Exploration",
    displayName: "Weltraumforschung",
  },
  { type: "CATEGORY", name: "Children's Game", displayName: "Kinderspiel" },
  { type: "CATEGORY", name: "Educational", displayName: "Lernspiel" },
  { type: "CATEGORY", name: "Bluffing", displayName: "Bluffen" },
  { type: "CATEGORY", name: "Murder/Mystery", displayName: "Mord/Mystery" },
  { type: "CATEGORY", name: "Prehistoric", displayName: "Prähistorisch" },
];

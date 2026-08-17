/**
 * Deutsche Labels für BGG-Mechanik-Fachbegriffe (#184) — feste Tabelle statt
 * Live-Übersetzung, da es sich um wiederkehrende, kurze Fachbegriffe handelt
 * (z. B. "Worker Placement"), keine freien Sätze. Einige BGG-Begriffe sind in
 * der deutschen Brettspielszene als Anglizismus etabliert (z. B. "Deckbuilding",
 * "Drafting") — dafür bewusst kein Eintrag, der Fallback auf den
 * Original-Begriff greift dann automatisch und ist bereits korrekt.
 */
const MECHANIC_TRANSLATIONS: Record<string, string> = {
  "Worker Placement": "Arbeitereinsatz",
  "Hand Management": "Handkartenmanagement",
  "Dice Rolling": "Würfelglück",
  "Tile Placement": "Plättchen platzieren",
  "Cooperative Game": "Kooperativ",
  "Action Points": "Aktionspunkte",
  "Route/Network Building": "Streckenbau",
  "Network and Route Building": "Streckenbau",
  "Auction/Bidding": "Versteigerung",
  "Simultaneous Action Selection": "Gleichzeitige Aktionswahl",
  Trading: "Handel",
  "Push Your Luck": "Risikomanagement",
  "Roll / Spin and Move": "Würfeln und Ziehen",
  "Point to Point Movement": "Bewegung entlang von Punkten",
  "Grid Movement": "Bewegung auf Gitterfeld",
  Memory: "Merkfähigkeit",
  "Pattern Building": "Musterbildung",
  "Modular Board": "Modularer Spielplan",
  "Card Drafting": "Drafting",
  Storytelling: "Geschichten erzählen",
  Voting: "Abstimmung",
  Negotiation: "Verhandlung",
  "Team-Based Game": "Teamspiel",
  "Player Elimination": "Spielerausscheidung",
  "Legacy Game": "Legacy-Spiel",
  "Solo / Solitaire Game": "Solospiel",
  "Hidden Roles": "Verdeckte Rollen",
  "Variable Player Powers": "Variable Spielerfähigkeiten",
  "Area Majority / Influence": "Gebietskontrolle",
  "Area Control / Area Influence": "Gebietskontrolle",
  "Zone of Control": "Kontrollzonen",
  Bluffing: "Bluffen",
};

/** Fällt auf den Original-Begriff zurück, wenn keine Übersetzung hinterlegt ist. */
export function translateMechanic(mechanic: string): string {
  return MECHANIC_TRANSLATIONS[mechanic] ?? mechanic;
}

export function translateMechanics(mechanics: string[]): string[] {
  return mechanics.map(translateMechanic);
}

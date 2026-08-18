/**
 * BGGs 10-stufige Farbskala von Dunkelrot bis Dunkelgrün für das
 * Rating-Hexagon (#214) — Farbe und deutsche Bedeutung anhand von
 * `Math.round(averageRating)` bestimmt. Fachvokabular gehört hierher, nicht
 * in die UI-Komponente.
 */
const RATING_SCALE: Record<number, { hex: string; meaning: string }> = {
  1: {
    hex: "#B71C1C",
    meaning:
      "Schrecklich – spottet jeder Beschreibung eines Spiels. Versetzt einen in schlechte Stimmung.",
  },
  2: {
    hex: "#E53935",
    meaning: "Extrem nervig oder sehr langweilig, aber technisch spielbar.",
  },
  3: {
    hex: "#EF5350",
    meaning:
      "Werde ich wahrscheinlich nicht noch einmal spielen, obwohl ich überzeugt werden könnte. Schlecht.",
  },
  4: {
    hex: "#FF7043",
    meaning:
      "Nicht so gut, reißt mich nicht mit. Ich spiele es, wenn nichts anderes verfügbar ist.",
  },
  5: {
    hex: "#FFA726",
    meaning:
      "Durchschnittliches Spiel, leicht langweilig, kann man mitnehmen oder lassen.",
  },
  6: {
    hex: "#FFCA28",
    meaning:
      "Ok-Spiel, macht zumindest etwas Spaß oder ist herausfordernd, spiele es gelegentlich.",
  },
  7: {
    hex: "#9CCC65",
    meaning: "Gutes Spiel, spiele es normalerweise gerne.",
  },
  8: {
    hex: "#66BB6A",
    meaning:
      "Sehr gutes Spiel. Ich spiele gerne mit. Werde es wahrscheinlich weiterempfehlen.",
  },
  9: {
    hex: "#43A047",
    meaning: "Exzellentes Spiel. Möchte es immer spielen.",
  },
  10: {
    hex: "#1B5E20",
    meaning:
      "Herausragend. Möchte es immer spielen und erwarte, dass sich das nie ändert.",
  },
};

/**
 * `null` bei fehlendem Rating oder außerhalb 1–10 (z. B. `0` bei einem Titel
 * ohne Bewertungen) — in beiden Fällen wird kein Hexagon angezeigt. Die
 * Farbstufe wird abgerundet (nicht kaufmännisch gerundet) bestimmt, damit sie
 * mit der auf BGG selbst angezeigten Farbe übereinstimmt (#214-Korrektur).
 */
export function resolveRatingScale(
  averageRating: number | null,
): { rounded: number; hex: string; meaning: string } | null {
  if (averageRating === null) return null;
  const rounded = Math.floor(averageRating);
  const entry = RATING_SCALE[rounded];
  return entry ? { rounded, ...entry } : null;
}

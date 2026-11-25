/**
 * Deterministische Kontakt-Zusatzfelder für Demo-Meeples
 * (`telegramHandle`/`signalHandle`/`discordHandle`/`doorbellNote`, siehe
 * `getContactLinks()` in `src/lib/members/contact.ts`) — nicht jedes Meeple
 * bekommt jedes Feld, damit die UI (leere vs. befüllte Kontaktmöglichkeiten)
 * realistisch aussieht statt für jeden Demo-Account identisch komplett.
 *
 * Handles werden aus dem Namen des Accounts selbst abgeleitet (nicht aus einem
 * gemeinsamen Pool), damit auf einem Profil nie der Handle eines *anderen*
 * Demo-Accounts steht und wie ein Mapping-Fehler aussieht.
 */

import { stableIndex } from "./stable-random";

const DOORBELL_NOTES = [
  "Klingel: 2. OG rechts",
  "Klingel oben, bitte zweimal klingeln",
  "Klingel beschriftet mit Nachnamen",
  "Hintereingang, Klingel neben der Garage",
];

/** `true` für ~jedes zweite Feld, abhängig von `key` und `fieldSalt` —
 * deterministisch pro Account, aber unterschiedlich je Feld. */
function stableInclude(key: string, fieldSalt: string) {
  return stableIndex(`${key}:${fieldSalt}`, 3) !== 0;
}

export type DemoContactFields = {
  telegramHandle: string | null;
  signalHandle: string | null;
  discordHandle: string | null;
  doorbellNote: string | null;
  bggUsername: string | null;
};

/** `key` ist typischerweise die E-Mail des Meeples; der Teil vor dem `@`
 * liefert den Handle-Stamm (`vater.musterfamilie`). */
export function randomDemoContactFields(key: string): DemoContactFields {
  const stem = key
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  const underscored = stem.replaceAll(".", "_");
  const pick = <T>(salt: string, value: T) =>
    stableInclude(key, salt) ? value : null;
  return {
    telegramHandle: pick("telegram", underscored),
    signalHandle: pick("signal", stem),
    discordHandle: pick("discord", stem),
    doorbellNote: pick(
      "doorbell",
      DOORBELL_NOTES[stableIndex(key, DOORBELL_NOTES.length)],
    ),
    bggUsername: pick("bgg", underscored),
  };
}

/**
 * Zufällige, aber deterministische Kontakt-Zusatzfelder für Demo-Meeples
 * (`telegramHandle`/`signalHandle`/`discordHandle`/`doorbellNote`, siehe
 * `getContactLinks()` in `src/lib/members/contact.ts`) — nicht jedes Meeple
 * bekommt jedes Feld, damit die UI (leere vs. befüllte Kontaktmöglichkeiten)
 * realistisch aussieht statt für jeden Demo-Account identisch komplett.
 */

import { stableIndex } from "./stable-random";

const TELEGRAM_HANDLES = [
  "lea_meeple",
  "tobi_boardgames",
  "om_vorstand",
  "kassenwart_aachen",
  "spielewart_om",
  "redakteur_om",
  "admin_om",
  "vater_musterfamilie",
  "mutter_musterfamilie",
];

const SIGNAL_HANDLES = [
  "lea.42",
  "tobi.meeple",
  "vorstand.om",
  "kassenwart.aachen",
  "spielewart.om",
  "redakteur.om",
  "admin.portal",
  "vater.musterfamilie",
  "mutter.musterfamilie",
];

const DISCORD_HANDLES = [
  "leademo",
  "tobi_demo",
  "vorstand_om",
  "kassenwart83",
  "spielewart.om",
  "redakteur_om",
  "admin_om",
  "vater.musterfamilie",
  "mutter.musterfamilie",
];

const DOORBELL_NOTES = [
  "Klingel: 2. OG rechts",
  "Klingel oben, bitte zweimal klingeln",
  "Klingel beschriftet mit Nachnamen",
  "Hintereingang, Klingel neben der Garage",
];

const BGG_USERNAMES = [
  "leaplays",
  "tobiboard",
  "vorstandom",
  "kassenwartom",
  "spielewart",
  "redakteurom",
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

/** `key` ist typischerweise die E-Mail oder der Displayname des Meeples. */
export function randomDemoContactFields(key: string): DemoContactFields {
  return {
    telegramHandle: stableInclude(key, "telegram")
      ? TELEGRAM_HANDLES[stableIndex(key, TELEGRAM_HANDLES.length)]
      : null,
    signalHandle: stableInclude(key, "signal")
      ? SIGNAL_HANDLES[stableIndex(key, SIGNAL_HANDLES.length)]
      : null,
    discordHandle: stableInclude(key, "discord")
      ? DISCORD_HANDLES[stableIndex(key, DISCORD_HANDLES.length)]
      : null,
    doorbellNote: stableInclude(key, "doorbell")
      ? DOORBELL_NOTES[stableIndex(key, DOORBELL_NOTES.length)]
      : null,
    bggUsername: stableInclude(key, "bgg")
      ? BGG_USERNAMES[stableIndex(key, BGG_USERNAMES.length)]
      : null,
  };
}

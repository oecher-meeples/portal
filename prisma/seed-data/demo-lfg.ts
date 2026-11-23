/**
 * Demo-Mitspieler-Gesuche (LFG, "Looking For Group") — decken die
 * unterschiedlichen Zustände ab: offen mit fixem Termin, offen mit
 * Terminvorschlag (`dateNote` statt `plannedAt`), und ein bereits
 * geschlossenes Gesuch (`closedAt`). `createdByKey` referenziert einen der
 * Schlüssel aus `meepleIdByKey` in `prisma/seed.ts`.
 */
export type DemoLfgPost = {
  id: string;
  title: string;
  gameTitle?: string;
  description: string;
  plannedAt?: Date;
  dateNote?: string;
  location?: string;
  maxParticipants: number;
  createdByKey: string;
  closedAt?: Date;
};

export const DEMO_LFG_POSTS: DemoLfgPost[] = [
  {
    id: "demo-lfg-catan-abend",
    title: "Catan-Abend bei mir",
    gameTitle: "Catan",
    description:
      "Suche noch 2-3 Mitspieler:innen für einen entspannten Catan-Abend. Anfänger:innen willkommen, ich erkläre gerne die Regeln.",
    plannedAt: new Date("2026-09-10T19:00:00+02:00"),
    location: "Vereinsheim",
    maxParticipants: 4,
    createdByKey: "lea",
  },
  {
    id: "demo-lfg-wingspan-testrunde",
    title: "Wingspan zu zweit oder dritt",
    gameTitle: "Wingspan",
    description:
      "Hab mir Wingspan neu zugelegt und würde es gerne ausprobieren. Wer Lust hat, meldet sich!",
    dateNote: "Flexibel, am liebsten irgendein Abend nächste Woche",
    location: "Vereinsheim",
    maxParticipants: 3,
    createdByKey: "tobias",
  },
  {
    id: "demo-lfg-brettspieltag-helfer",
    title: "Spieleerklärer:innen für öffentlichen Brettspieltag gesucht",
    description:
      "Für unseren nächsten öffentlichen Brettspieltag suchen wir noch ein paar Meeples, die Lust haben, Gästen Spiele zu erklären.",
    plannedAt: new Date("2026-09-20T14:00:00+02:00"),
    location: "Mefferdatisstr. 16, 52062 Aachen",
    maxParticipants: 6,
    createdByKey: "spielewart",
  },
  {
    id: "demo-lfg-siebzehn-und-vier",
    title: "Siebzehn und Vier — Kartenspielrunde",
    gameTitle: "Siebzehn und Vier",
    description:
      "Kurze, kurzweilige Kartenspielrunde für zwischendurch. Dauert nicht lang, perfekt für den Feierabend.",
    plannedAt: new Date("2026-08-20T18:30:00+02:00"),
    location: "Vereinsheim",
    maxParticipants: 5,
    createdByKey: "vorstand",
    closedAt: new Date("2026-08-21T09:00:00+02:00"),
  },
];

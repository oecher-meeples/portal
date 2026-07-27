export type LfgStatus = "offen" | "voll";

export type LfgParticipant = {
  name: string;
  initial: string;
};

export type LfgRequest = {
  id: string;
  title: string;
  game?: string;
  date: string;
  location?: string;
  creator: LfgParticipant;
  maxParticipants: number;
  participants: LfgParticipant[];
  status: LfgStatus;
  description: string;
};

export const LFG_REQUESTS: LfgRequest[] = [
  {
    id: "arche-nova-freitag",
    title: "Arche Nova am Freitag",
    game: "Arche Nova",
    date: "Fr 01.08. · 18:30",
    location: "Bürgerzentrum",
    creator: { name: "Lea", initial: "L" },
    maxParticipants: 4,
    participants: [
      { name: "Lea", initial: "L" },
      { name: "Jan", initial: "J" },
    ],
    status: "offen",
    description:
      "Suche noch zwei Mitspielende für eine entspannte Runde Arche Nova.",
  },
  {
    id: "suche-runde-egal-was",
    title: "Suche Runde – egal was!",
    date: "Sa 09.08. · offen",
    creator: { name: "Tobias", initial: "T" },
    maxParticipants: 5,
    participants: [{ name: "Tobias", initial: "T" }],
    status: "offen",
    description:
      "Bin spontan am Samstag da und offen für alles zwischen Kennerspiel und Party-Spiel.",
  },
  {
    id: "brass-kennerrunde",
    title: "Brass-Kennerrunde",
    game: "Brass: Birmingham",
    date: "So 10.08. · 15:00",
    creator: { name: "Jan", initial: "J" },
    maxParticipants: 4,
    participants: [
      { name: "Jan", initial: "J" },
      { name: "Nadia", initial: "N" },
      { name: "Lea", initial: "L" },
      { name: "Tobias", initial: "T" },
    ],
    status: "voll",
    description:
      "Feste Vierergruppe für eine ernsthafte Brass-Partie, keine weiteren Plätze frei.",
  },
  {
    id: "familienabend-mit-kids",
    title: "Familienabend mit Kids",
    date: "Mi 13.08.",
    creator: { name: "Nadia", initial: "N" },
    maxParticipants: 6,
    participants: [
      { name: "Nadia", initial: "N" },
      { name: "Nadias Familie", initial: "N" },
      { name: "Lea", initial: "L" },
    ],
    status: "offen",
    description:
      "Leichte Familienspiele, auch für Kinder ab 8 geeignet. Gerne mit euren Kids vorbeikommen.",
  },
];

export function getLfgById(id: string) {
  return LFG_REQUESTS.find((request) => request.id === id);
}

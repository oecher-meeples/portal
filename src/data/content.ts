export type ContentType = "termin" | "blog" | "turnier";

export type ContentItem = {
  slug: string;
  type: ContentType;
  title: string;
  excerpt: string;
  body: string[];
  date: string;
  author?: string;
  location?: string;
  internal?: boolean;
  instagram?: boolean;
};

export const CONTENT_ITEMS: ContentItem[] = [
  {
    slug: "offener-spieleabend-01-08",
    type: "termin",
    title: "Offener Spieleabend",
    excerpt:
      "Jeden Freitag treffen wir uns zum offenen Spielen. Neulinge willkommen – Erklärbär vor Ort.",
    body: [
      "Wie jeden Freitag öffnen wir ab 18:30 Uhr unsere Türen im Bürgerzentrum für alle, die Lust auf einen entspannten Spieleabend haben.",
      "Ob Einsteiger oder Vielspieler: an mehreren Tischen stehen Erklärbären bereit, die euch in neue Titel einführen. Die Ludothek bringt eine Auswahl aktueller Neuzugänge mit.",
    ],
    date: "2026-08-01",
    location: "Bürgerzentrum",
  },
  {
    slug: "arche-nova-cup-2026-bericht",
    type: "blog",
    title: "Arche Nova Cup 2026 – der Bericht",
    excerpt: "Zwölf Teilnehmende, drei Runden, ein Sieger. Wir blicken zurück auf ein packendes Turnier.",
    body: [
      "Am vergangenen Samstag traten zwölf Meeples in drei Runden gegeneinander an, um die Arche-Nova-Krone des Jahres zu erringen.",
      "Nach spannenden Endrunden setzte sich Nadia knapp gegen den Titelverteidiger durch. Danke an alle Teilnehmenden und an unsere Erklärbären für die Turnierleitung!",
    ],
    date: "2026-07-24",
    author: "Lea Meier",
    instagram: true,
  },
  {
    slug: "kennerspiel-turnier-09-08",
    type: "termin",
    title: "Kennerspiel-Turnier",
    excerpt: "Anmeldung über den Mitgliederbereich. Begrenzte Plätze.",
    body: [
      "Unser jährliches Kennerspiel-Turnier steht an: Dieses Jahr treten wir in drei Runden mit wechselnden Kennerspiel-Klassikern gegeneinander an.",
      "Die Teilnahme ist auf 16 Personen begrenzt. Anmeldung bitte über die Spielergesuche im Mitgliederbereich.",
    ],
    date: "2026-08-09",
    location: "Vereinsheim",
  },
  {
    slug: "12-neue-spiele-im-regal",
    type: "blog",
    title: "12 neue Spiele im Regal",
    excerpt: "Frisch inventarisiert und ausleihbar.",
    body: [
      "Die Ludothek wächst weiter! Diesen Monat sind zwölf neue Titel dazugekommen, darunter mehrere Kennerspiel-Nominierte.",
      "Alle neuen Spiele sind bereits mit QR-Etikett versehen und können ab sofort über die Ludothek ausgeliehen werden.",
    ],
    date: "2026-07-20",
    author: "Tobias K.",
  },
  {
    slug: "familien-nachmittag-15-08",
    type: "termin",
    title: "Familien-Nachmittag",
    excerpt: "Ab 15:00 – Spiele für die ganze Familie, von Kindern bis Großeltern.",
    body: [
      "Unser monatlicher Familien-Nachmittag richtet sich an alle Altersgruppen. Wir stellen eine Auswahl leichter Familienspiele bereit.",
      "Kein Anmeldung nötig, einfach vorbeikommen.",
    ],
    date: "2026-08-15",
    location: "Bürgerzentrum",
  },
  {
    slug: "sommerfest-der-meeples",
    type: "blog",
    title: "Sommerfest der Meeples",
    excerpt: "Danke an alle Helfer:innen!",
    body: [
      "Unser Sommerfest war ein voller Erfolg – über 80 Gäste haben mit uns gefeiert, gespielt und gegrillt.",
      "Ein großes Dankeschön an alle, die sich in den Helferschichten eingetragen haben und das Fest erst möglich gemacht haben.",
    ],
    date: "2026-06-15",
    author: "Jan Herwig",
    instagram: true,
  },
  {
    slug: "jahreshauptversammlung-2026",
    type: "termin",
    title: "Jahreshauptversammlung",
    excerpt: "Terminumfrage läuft – bitte abstimmen.",
    body: [
      "Die diesjährige Jahreshauptversammlung steht an. Bitte beteiligt euch an der Terminumfrage im internen Kalender.",
      "Tagesordnung folgt in Kürze über den internen Newsroom.",
    ],
    date: "2026-09-05",
    internal: true,
  },
];

export function getContentBySlug(slug: string) {
  return CONTENT_ITEMS.find((item) => item.slug === slug);
}

export function getUpcomingEvents(limit = 3) {
  return CONTENT_ITEMS.filter((item) => item.type !== "blog")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}

export function getLatestPosts(limit = 3) {
  return [...CONTENT_ITEMS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

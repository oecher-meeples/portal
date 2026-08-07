import type { PostType } from "@prisma/client";

/**
 * Demo-Beiträge für den News-Bereich. Die externen Beiträge sind reale Facebook-
 * und Instagram-Posts von @oechermeeples (Text, Datum und Coverbild 1:1
 * übernommen; Bilder liegen lokal unter public/demo-posts/, siehe unten). Die
 * internen Beiträge sind fiktiv, da vereinsinterne Inhalte naturgemäß nicht auf
 * Social Media stehen.
 */
export type DemoPost = {
  slug: string;
  type: PostType;
  title: string;
  excerpt: string;
  body: string;
  /** ISO-Datum */
  date: string;
  author?: string;
  location?: string;
  internal: boolean;
  /** Nur bei externen (nicht-internen) Beiträgen erlaubt, siehe post-form.tsx. */
  instagram: boolean;
  coverImageUrl: string;
};

export const DEMO_POSTS: DemoPost[] = [
  {
    // Instagram @oechermeeples, Post DbQREV_ILPK, veröffentlicht 26.07.2026 —
    // inhaltsgleich mit dem Facebook-Post vom selben Tag.
    slug: "meffis-brettspieltag-2026-08-01",
    type: "TERMIN",
    title: "Öffentlicher Brettspiele-Tag bei den meffi.s",
    excerpt:
      "Wir unterstützen die meffi.s bei ihrer Spieleveranstaltung und bringen beliebte Klassiker und Neuheiten mit.",
    body: "Wir freuen uns, eine Veranstaltung der meffi.s unterstützen zu dürfen. Kommt gerne am 01.08. in die Mefferdatisstraße und entdeckt mit uns die Welt der Brettspiele 😁",
    date: "2026-08-01",
    author: "Admin",
    location: "Mefferdatisstr. 16, 52062 Aachen",
    internal: false,
    instagram: true,
    coverImageUrl: "/demo-posts/meffis-brettspieltag-2026-08-01.jpg",
  },
  {
    // Instagram @oechermeeples, Post DYNjeFlI613, veröffentlicht 11.05.2026 —
    // Ankündigung für den Auftritt bei "Aachen zeigt Engagement" am 30.05.2026.
    slug: "aachen-zeigt-engagement-2026-05-30",
    type: "TERMIN",
    title: "Aachen zeigt Engagement 2026",
    excerpt:
      "Auch dieses Jahr sind wir bei Aachen zeigt Engagement dabei — mit Spielen für Groß und Klein im Gepäck.",
    body: "Auch wir Oecher Meeples sind in diesem Jahr wieder bei Aachen zeigt Engagement dabei. Wir stellen uns und unseren Verein vor und werden ein paar Spiele für Groß und Klein im Gepäck haben. Zudem stehen wir neben unseren Freunden von Herzkrankes Kind e.V. Also kommt vorbei!",
    date: "2026-05-30",
    author: "Admin",
    location: "Stadtpark Aachen",
    internal: false,
    instagram: true,
    coverImageUrl: "/demo-posts/aachen-zeigt-engagement-2026-05-11.jpg",
  },
  {
    // Instagram @oechermeeples, Post DYxsQgoIxzG, veröffentlicht 25.05.2026.
    slug: "button-produktion-aachen-engagement-2026-05-25",
    type: "BLOG",
    title: "Button-Produktion läuft",
    excerpt:
      "Die eigenen Buttons für Aachen zeigt Engagement werden gerade gepresst.",
    body: "Button Produktion läuft, Aachen zeigt Engagement kann kommen 😁",
    date: "2026-05-25",
    author: "Admin",
    internal: false,
    instagram: true,
    coverImageUrl:
      "/demo-posts/button-produktion-aachen-engagement-2026-05-25.jpg",
  },
  {
    // Instagram @oechermeeples, Post DYrVNdpiH2U, veröffentlicht 23.05.2026.
    slug: "hinter-den-spiegeln-tapas-2026-05-23",
    type: "BLOG",
    title: "Zu Besuch bei Hinter den Spiegeln",
    excerpt:
      "Brettspiele erklärt, Tapas gegessen und das schöne Wetter genossen.",
    body: "Wir waren ein weiteres Mal zu besuch bei @hinterden_spiegeln um Brettspiele zu erklären köstlich Tapas zu essen und das schöne Wetter zu genießen 🤩",
    date: "2026-05-23",
    author: "Admin",
    location: "Hinter den Spiegeln, Aachen",
    internal: false,
    instagram: true,
    coverImageUrl: "/demo-posts/hinter-den-spiegeln-tapas-2026-05-23.jpg",
  },
  {
    // Instagram @oechermeeples, Post DYdLAcziFAw, veröffentlicht 17.05.2026.
    slug: "games-night-juki-2026-05-17",
    type: "BLOG",
    title: "Rückblick: Games Night im JUKI",
    excerpt:
      "Rund 100 Besucherinnen und Besucher haben die Games Night im JUKI wieder richtig voll gemacht.",
    body: "Danke für die tolle games night. Mit etwa 100 Besuchern haben wir es geschafft die @juki_ac wieder richtig voll bekommen. Besonders gefreut haben wir uns das @spielfieberac und @dicedrawdiscard mit von der Party waren. Es macht einfach sehr viel Spaß mit Euch. Bis zur nächsten Runde im September.",
    date: "2026-05-17",
    author: "Admin",
    location: "JUKI Aachen",
    internal: false,
    instagram: true,
    coverImageUrl: "/demo-posts/games-night-juki-2026-05-17.jpg",
  },
  {
    // Instagram @oechermeeples, Post DXJfL2kCMR7, veröffentlicht 15.04.2026.
    slug: "naechster-termin-fantastische-reiche-2026-04-15",
    type: "BLOG",
    title: "Unser nächster Termin nähert sich",
    excerpt:
      "Diesmal geht es in fantastische Reiche — spannende Abenteuer und neue Spezies warten.",
    body: "Unser nächster Termin nähert sich und diesmal möchten wir euch in fantastische Reiche führen. Erlebt spannende Abenteuer und entdeckte neue Spezien ! Wir freuen uns auf Euch!",
    date: "2026-04-15",
    author: "Admin",
    internal: false,
    instagram: true,
    coverImageUrl: "/demo-posts/fantastische-reiche-termin-2026-04-15.jpg",
  },
  {
    slug: "mitgliederversammlung-2026",
    type: "TERMIN",
    title: "Mitgliederversammlung 2026",
    excerpt:
      "Jahresrückblick, Kassenbericht und Wahl des Vorstands — Teilnahme ist Pflicht für alle Mitglieder.",
    body: "Die jährliche Mitgliederversammlung findet dieses Jahr im großen Saal statt. Tagesordnung und Unterlagen werden vorab per Newsletter verschickt.",
    date: "2026-09-18",
    author: "Admin",
    location: "Vereinsheim Aachen, großer Saal",
    internal: true,
    instagram: false,
    coverImageUrl: "/demo-posts/games-night-juki-2026-05-17.jpg",
  },
  {
    slug: "thekendienst-einteilung-q4",
    type: "BLOG",
    title: "Thekendienst-Einteilung für Q4",
    excerpt:
      "Die Schichtplanung für Oktober bis Dezember steht — bitte Wunschtermine bis Ende des Monats eintragen.",
    body: "Ab sofort könnt ihr eure Wunschschichten für das vierte Quartal im internen Schichtplan eintragen. Bei Engpässen meldet euch bitte frühzeitig.",
    date: "2026-09-01",
    author: "Admin",
    internal: true,
    instagram: false,
    coverImageUrl: "/demo-posts/hinter-den-spiegeln-tapas-2026-05-23.jpg",
  },
  {
    slug: "erklaerspieler-schulung-2026",
    type: "BLOG",
    title: "Neue Runde Erklärspieler-Schulung",
    excerpt:
      "Sechs neue Mitglieder wurden zu Erklärspielern für unsere Vereinsabende ausgebildet.",
    body: "In einer zweistündigen Schulung lernten sechs Mitglieder, wie man Regeln verständlich vermittelt und Neulingen den Einstieg erleichtert.",
    date: "2026-05-15",
    author: "Lea Demo",
    internal: true,
    instagram: false,
    coverImageUrl:
      "/demo-posts/button-produktion-aachen-engagement-2026-05-25.jpg",
  },
  {
    slug: "vorstandssitzung-protokoll-august",
    type: "BLOG",
    title: "Protokoll der Vorstandssitzung August 2026",
    excerpt:
      "Beschlüsse zu Budget, Ludothek-Ausbau und Flohmarkt-Terminen im Überblick.",
    body: "Der Vorstand hat in der August-Sitzung das Budget für die Ludothek-Erweiterung freigegeben und den Termin für den Herbstflohmarkt bestätigt.",
    date: "2026-08-10",
    author: "Admin",
    internal: true,
    instagram: false,
    coverImageUrl: "/demo-posts/meffis-brettspieltag-2026-08-01.jpg",
  },
];

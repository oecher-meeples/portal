export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
};

export const LEGAL_CONTENT: Record<string, LegalSection[]> = {
  satzung: [
    {
      id: "name-sitz",
      heading: "§ 1 Name und Sitz",
      paragraphs: [
        "Der Verein führt den Namen „Oecher Meeples e. V.“ und hat seinen Sitz in Aachen.",
        "Platzhaltertext – die endgültige Satzung wird vor Vereinsgründung final abgestimmt.",
      ],
    },
    {
      id: "zweck",
      heading: "§ 2 Vereinszweck",
      paragraphs: [
        "Der Verein fördert die Brettspielkultur in Aachen und Umgebung durch offene Spieleabende, eine gemeinsame Ludothek und Veranstaltungen.",
      ],
    },
    {
      id: "mitgliedschaft",
      heading: "§ 3 Mitgliedschaft",
      paragraphs: [
        "Die Mitgliedschaft wird auf Einladung eines bestehenden Mitglieds erworben und ist an die Zahlung des Jahresbeitrags gebunden.",
      ],
    },
  ],
  datenschutz: [
    {
      id: "verantwortlicher",
      heading: "1. Verantwortlicher",
      paragraphs: [
        "Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist der Vorstand der Oecher Meeples e. V.",
      ],
    },
    {
      id: "verarbeitete-daten",
      heading: "2. Verarbeitete Daten",
      paragraphs: [
        "Wir verarbeiten Name, E-Mail-Adresse und, sofern für den SEPA-Lastschrifteinzug erforderlich, Bankverbindungen unserer Mitglieder.",
        "Bei Austritt wird das Konto gelöscht; die Verleih-Historie bleibt anonymisiert erhalten.",
      ],
    },
    {
      id: "rechte",
      heading: "3. Betroffenenrechte",
      paragraphs: [
        "Mitglieder können jederzeit Auskunft über die gespeicherten Daten verlangen und einen Export über den eigenen Profilbereich anfordern.",
      ],
    },
  ],
  impressum: [
    {
      id: "angaben",
      heading: "Angaben gemäß § 5 TMG",
      paragraphs: [
        "Oecher Meeples e. V.",
        "Musterstraße 1, 52062 Aachen",
        "Platzhalter – finale Angaben folgen.",
      ],
    },
    {
      id: "kontakt",
      heading: "Kontakt",
      paragraphs: ["E-Mail: vorstand@oecher-meeples.de (Platzhalter)"],
    },
  ],
  beitragsordnung: [
    {
      id: "beitraege",
      heading: "1. Jahresbeiträge",
      paragraphs: [
        "Der reguläre Jahresbeitrag beträgt 60 €, ermäßigt 36 € für Schüler:innen, Studierende und Auszubildende.",
      ],
    },
    {
      id: "faelligkeit",
      heading: "2. Fälligkeit",
      paragraphs: [
        "Der Beitrag wird jährlich zum 1. Februar per SEPA-Lastschrift eingezogen.",
      ],
    },
  ],
};

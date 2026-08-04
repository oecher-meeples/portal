export type LegalSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
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
        "Stammdaten: Name, E-Mail-Adresse, Mitgliedsnummer, Ein- und ggf. Austrittsdatum.",
        "Bankverbindung: IBAN und Kontoinhaber:in, sofern für den SEPA-Lastschrifteinzug des Jahresbeitrags erforderlich. Nur der Kassenwart hat Zugriff auf vollständige IBANs, jeder Zugriff wird protokolliert.",
        "Freiwillige Messenger- und Plattformkennungen: BoardGameGeek-, BoardGameArena-, Telegram-, Signal- und Discord-Handle, sofern angegeben.",
        "Verhaltensdaten aus der Vereinsnutzung: Verleih- und Rückgabehistorie der Ludothek, Schichtbuchungen bei Veranstaltungen, Zuordnung und Anwesenheit als Erklärbär:in, Mitspielsuchen (LFG-Posts) samt Teilnahme, Flohmarkt- und Marktplatz-Angebote inklusive der dabei hochgeladenen Fotos, sowie die private Spielesammlung, die ein Mitglied im Portal hinterlegt. In der Summe entsteht dabei ein Nutzungsprofil der Vereinsaktivität.",
        "Bei Austritt wird das Konto anonymisiert; Verleih-Historie und Vereinshistorie bleiben ohne Personenbezug erhalten.",
      ],
    },
    {
      id: "rechtsgrundlagen",
      heading: "3. Rechtsgrundlagen",
      paragraphs: [
        "Stammdaten, Bankverbindung und die Verhaltensdaten aus der Vereinsnutzung verarbeiten wir zur Erfüllung des Mitgliedsvertrags und der sich daraus ergebenden Pflichten, insbesondere des Beitragseinzugs (Art. 6 Abs. 1 lit. b DSGVO).",
        "Die freiwilligen Messenger- und Plattformkennungen verarbeiten wir auf Grundlage der Einwilligung des jeweiligen Mitglieds (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung kann jederzeit für die Zukunft widerrufen werden.",
      ],
    },
    {
      id: "speicherdauern",
      heading: "4. Speicherdauern",
      paragraphs: [
        "Protokolle über Zugriffe auf Bankdaten (wer wann welche IBAN eingesehen hat) werden 24 Monate gespeichert und danach automatisch gelöscht.",
        "TODO: Die Aufbewahrungsfrist für Stammdaten nach einem Austritt ist noch nicht durch den Vorstand entschieden (Konflikt zwischen Datenminimierung und steuerlicher Belegaufbewahrung für Beitragsdaten). Bis zur Entscheidung werden Konten bei Austritt anonymisiert, aber nicht automatisch gelöscht.",
      ],
    },
    {
      id: "rechte",
      heading: "5. Betroffenenrechte",
      paragraphs: [
        "Mitglieder haben nach der DSGVO das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) hinsichtlich ihrer personenbezogenen Daten.",
        "Eine erteilte Einwilligung kann jederzeit mit Wirkung für die Zukunft widerrufen werden (Art. 7 Abs. 3 DSGVO).",
        "Mitglieder haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 13 Abs. 2 lit. d DSGVO).",
        "Für Auskunft und Datenübertragbarkeit gibt es einen Self-Service: eingeloggte Mitglieder können sich im eigenen Profilbereich unter „Datenschutz“ alle zu ihnen gespeicherten Daten als JSON-Datei herunterladen. Die vollständige IBAN ist darin bewusst nicht enthalten, sondern nur deren letzte vier Stellen — eine unverschlüsselte Exportdatei mit vollständiger IBAN wäre ein neues Datenschutzproblem; für die vollständige Bankverbindung wendet euch an den Kassenwart.",
        "Für alle übrigen Anliegen wendet euch bitte an den Vorstand über die im Impressum genannten Kontaktdaten.",
      ],
    },
    {
      id: "auftragsverarbeiter",
      heading: "6. Auftragsverarbeiter und Empfänger",
      paragraphs: [
        "Neon (Datenbank-Hosting und Authentifizierung), Vercel (Anwendungs-Hosting und Datei-Speicher) und Meta (Instagram, für das automatische Cross-Posting von Vereinsbeiträgen) erhalten im Rahmen ihrer jeweiligen Funktion Zugriff auf Teile der verarbeiteten Daten.",
        "TODO: Der Abschluss von Auftragsverarbeitungsverträgen nach Art. 28 DSGVO mit diesen Anbietern ist Vereinsarbeit und hier noch nicht bestätigt.",
      ],
    },
    {
      id: "cookies",
      heading: "7. Cookies",
      paragraphs: [
        "Wir setzen ausschließlich technisch notwendige Session-Cookies von Neon Auth ein, um eingeloggte Mitglieder wiederzuerkennen. Es findet kein Tracking und keine Analyse des Nutzungsverhaltens durch Dritte statt.",
      ],
    },
  ],
  impressum: [
    {
      id: "angaben",
      heading: "Angaben gemäß § 5 DDG",
      paragraphs: [
        "Oecher Meeples e. V.",
        "Aretzstr. 57, 52070 Aachen (c/o Tanja Bell)",
      ],
    },
    {
      id: "vertretungsberechtigte",
      heading: "Vertretungsberechtigte",
      paragraphs: [
        "1. Vorsitzende: Tanja Bell",
        "2. Vorsitzender: Sven Denysiuk",
        "Kassenwart: Thomas Kösch",
      ],
    },
    {
      id: "kontakt",
      heading: "Kontakt",
      paragraphs: ["E-Mail: info@oecher-meeples.org"],
    },
    {
      id: "registereintrag",
      heading: "Registereintrag",
      paragraphs: ["Amtsgericht Aachen, VR 5419"],
    },
    {
      id: "verwendete-software",
      heading: "Verwendete Software",
      paragraphs: [
        "Dieses Portal nutzt zahlreiche Open-Source-Bibliotheken. Ein vollständiges Verzeichnis mit Lizenzangaben steht als Download bereit.",
      ],
      links: [
        {
          label: "Third-Party-Lizenzverzeichnis",
          href: "/THIRD-PARTY-LICENSES.md",
        },
      ],
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

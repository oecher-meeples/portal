import { LEGAL_DOCS } from "../../src/data/downloads";
import type { LegalSection } from "../../src/data/legal";

/**
 * The four Rechtliches documents previously hard-coded as `LEGAL_CONTENT` in
 * src/data/legal.ts, migrated as `LegalDocument` rows so an admin can attach
 * a PDF and edit sections from now on. `pdfFileUrl: null` until an admin
 * uploads the first PDF through /rechtliches/<slug>/edit.
 */
export const DEMO_LEGAL_DOCUMENTS: {
  slug: string;
  title: string;
  sections: LegalSection[];
  pdfFileUrl: string | null;
}[] = [
  {
    slug: "satzung",
    title: LEGAL_DOCS.find((doc) => doc.slug === "satzung")!.title,
    pdfFileUrl: null,
    sections: [
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
  },
  {
    slug: "datenschutz",
    title: LEGAL_DOCS.find((doc) => doc.slug === "datenschutz")!.title,
    pdfFileUrl: null,
    sections: [
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
          "Wohnort und Klingelschild-Notiz: freiwillige Angabe im Profil, ausschließlich für das Mitglied selbst sichtbar. Für andere Mitglieder wird der Wohnort erst dann sichtbar, wenn das Mitglied ihn bei einem konkreten Spielgesuch (LFG) ausdrücklich per Klick freigibt — dann sehen die Teilnehmer:innen dieses Gesuchs Wohnort und Klingelschild-Notiz gemeinsam. Ohne diese explizite Aktion pro Gesuch bleiben beide Angaben verborgen.",
          "Verhaltensdaten aus der Vereinsnutzung: Verleih- und Rückgabehistorie der Ludothek, Schichtbuchungen bei Veranstaltungen, Zuordnung und Anwesenheit als Erklärbär:in, Mitspielsuchen (LFG-Posts) samt Teilnahme, Flohmarkt- und Marktplatz-Angebote inklusive der dabei hochgeladenen Fotos, sowie die private Spielesammlung, die ein Mitglied im Portal hinterlegt. In der Summe entsteht dabei ein Nutzungsprofil der Vereinsaktivität.",
          "Bei Austritt wird das Konto anonymisiert; Verleih-Historie und Vereinshistorie bleiben ohne Personenbezug erhalten.",
        ],
      },
      {
        id: "rechtsgrundlagen",
        heading: "3. Rechtsgrundlagen",
        paragraphs: [
          "Stammdaten, Bankverbindung und die Verhaltensdaten aus der Vereinsnutzung verarbeiten wir zur Erfüllung des Mitgliedsvertrags und der sich daraus ergebenden Pflichten, insbesondere des Beitragseinzugs (Art. 6 Abs. 1 lit. b DSGVO).",
          "Die freiwilligen Messenger- und Plattformkennungen sowie Wohnort und Klingelschild-Notiz verarbeiten wir auf Grundlage der Einwilligung des jeweiligen Mitglieds (Art. 6 Abs. 1 lit. a DSGVO). Die Einwilligung kann jederzeit für die Zukunft widerrufen werden.",
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
          "Neon (Datenbank-Hosting und Authentifizierung), Vercel (Anwendungs-Hosting, Datei-Speicher und anonymisierte Reichweitenmessung über Vercel Web Analytics) und Meta (Instagram, für das automatische Cross-Posting von Vereinsbeiträgen) erhalten im Rahmen ihrer jeweiligen Funktion Zugriff auf Teile der verarbeiteten Daten.",
          "TODO: Der Abschluss von Auftragsverarbeitungsverträgen nach Art. 28 DSGVO mit diesen Anbietern ist Vereinsarbeit und hier noch nicht bestätigt.",
        ],
      },
      {
        id: "cookies",
        heading: "7. Cookies und Analyse-Tools",
        paragraphs: [
          "Wir setzen ein technisch notwendiges Session-Cookie von Neon Auth ein, um eingeloggte Mitglieder wiederzuerkennen. Es ist zur Bereitstellung des Portals erforderlich und einwilligungsfrei nach § 25 Abs. 2 TDDDG.",
          "Zur anonymisierten Reichweitenmessung nutzen wir Vercel Web Analytics. Der Dienst setzt keine Cookies und speichert keine dauerhafte, gerätebezogene Kennung — Besucher werden anhand eines aus der einzelnen Anfrage abgeleiteten Hash-Werts identifiziert, der nach 24 Stunden verfällt. Erhoben werden ausschließlich aggregierte, anonyme Daten (aufgerufene Seite, Referrer, grobe Geolocation, Browser/Betriebssystem, Gerätetyp) — keine Wiedererkennung einzelner Besucher über mehrere Sitzungen hinweg. Näheres bei Vercel: https://vercel.com/docs/analytics/privacy-policy.",
          "Da Vercel Web Analytics ohne Cookies und ohne persistente Client-ID arbeitet, greift § 25 Abs. 2 TDDDG hier nicht — es ist kein Einwilligungsbanner erforderlich. Sollte künftig ein Analyse- oder Tracking-Tool mit nicht-notwendigen Cookies hinzukommen, wird dieser Abschnitt entsprechend erweitert.",
        ],
      },
    ],
  },
  {
    slug: "impressum",
    title: LEGAL_DOCS.find((doc) => doc.slug === "impressum")!.title,
    pdfFileUrl: null,
    sections: [
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
  },
  {
    slug: "beitragsordnung",
    title: LEGAL_DOCS.find((doc) => doc.slug === "beitragsordnung")!.title,
    pdfFileUrl: null,
    sections: [
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
  },
  {
    slug: "urheberrechte",
    title: LEGAL_DOCS.find((doc) => doc.slug === "urheberrechte")!.title,
    pdfFileUrl: null,
    sections: [
      {
        id: "bilder",
        heading: "Bilder und Grafiken",
        paragraphs: [
          "Aktuell setzt das Portal keine attributionspflichtigen Stock-Bilder oder -Grafiken ein. Alle verwendeten visuellen Assets (Logo, Hintergrundmuster) sind eigenes Vereinsmaterial.",
          "Ein früher auf der Vorgängerseite genutztes Stock-Bild („Aachen Skyline“, #41744895, Urheber: JiSign, Quelle: Fotolia) ist im aktuellen Portal nicht mehr im Einsatz.",
        ],
      },
      {
        id: "icons",
        heading: "Icons",
        paragraphs: [
          "Die im Portal verwendeten Icons stammen aus der Bibliothek „lucide-react“ (MIT-Lizenz).",
        ],
        links: [
          {
            label: "Third-Party-Lizenzverzeichnis",
            href: "/THIRD-PARTY-LICENSES.md",
          },
        ],
      },
      {
        id: "fonts",
        heading: "Web-Fonts",
        paragraphs: [
          "Die Schriftarten „Geist“ und „Geist Mono“ werden über Google Fonts eingebunden. Beide stehen unter der SIL Open Font License und erfordern keine Urhebernennung im laufenden Betrieb.",
        ],
      },
    ],
  },
];

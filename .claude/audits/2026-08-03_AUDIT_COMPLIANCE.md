# Compliance-Audit — Oecher Meeples Portal

- **Datum:** 2026-08-03
- **Branch / HEAD:** `app-akademie` @ `525f40f`
- **Vorheriger Compliance-Bericht:** keiner (`.claude/audits/` war leer) — dies ist der Erstlauf, kein Abgleich möglich.
- **Eigene Lizenz:** **proprietär** (`LICENSE`, © 2026 Jan Herwig, "All rights reserved"). Einzige Einräumung: Ansicht zur akademischen Begutachtung im Rahmen des Kurses "Rapid Extendable Prototyping".
- **Scope:** Lizenz-Compliance aller Production-Dependencies + Datenschutz (das Projekt verarbeitet personenbezogene Daten — Mitgliederverwaltung mit Bankverbindungen).
- **Kein Ersatz für anwaltliche Prüfung.** Die AGPL-Funde unten sind ein reales Risiko, dessen Bewertung eine juristische Einschätzung braucht.

---

## Prioritized Findings

| #    | Schwere      | Bereich     | Kurzfassung                                                                       |
| ---- | ------------ | ----------- | --------------------------------------------------------------------------------- |
| C-1  | **Kritisch** | Lizenz      | `@triplit/client` (AGPL-3.0-only) im Production-Tree eines proprietären Projekts   |
| C-2  | **Kritisch** | Lizenz      | `ua-parser-js` (AGPL-3.0-or-later) — bewusstes Copyleft-oder-zahlen-Modell         |
| C-3  | **Kritisch** | Datenschutz | Datenschutzerklärung verspricht einen Datenexport, den es im Code nicht gibt       |
| H-1  | Hoch         | Lizenz      | 3 × `@triplit/*` ohne erkennbare Lizenz ("Unknown") — kein Nutzungsrecht by default |
| H-2  | Hoch         | Datenschutz | Datenschutzerklärung nennt nur 3 von ~15 tatsächlich verarbeiteten Datenarten      |
| H-3  | Hoch         | Datenschutz | Impressum ist Platzhalter, Route `/rechtliches/impressum` ist öffentlich live      |
| M-1  | Mittel       | Lizenz      | 5 × MPL-2.0 (u. a. `@vercel/og`, tatsächlich genutzt) ohne Notices-Datei           |
| M-2  | Mittel       | Lizenz      | `@img/sharp-win32-x64`: Apache-2.0 **AND** LGPL-3.0-or-later (libvips)             |
| M-3  | Mittel       | Lizenz      | Keine NOTICE-/THIRD-PARTY-Datei für ~700 MIT/Apache/BSD-Pakete                    |
| M-4  | Mittel       | Datenschutz | Anonymisierung räumt Freitextfelder und Blob-Bilder nicht mit                      |
| M-5  | Mittel       | Datenschutz | Kein Selbstbedienungs-Löschweg; Ausgetretene bleiben unbegrenzt identifizierbar    |
| M-6  | Mittel       | Datenschutz | Bank-CSV mit Klartext-IBAN ohne Hinweis auf den Inhalt der Datei                   |
| L-1  | Niedrig      | Lizenz      | `better-auth`, `@prisma/client` als devDependencies deklariert, aber Runtime       |
| L-2  | Niedrig      | Datenschutz | `InstagramConnection.accessToken` im Klartext, während IBANs verschlüsselt sind    |
| L-3  | Niedrig      | Datenschutz | Kein Wort zu Cookies in der Datenschutzerklärung                                   |

---

## Stand der Umsetzung (2026-08-04)

| Finding | Issue | Status |
| --- | --- | --- |
| C-1, C-2, H-1 (AGPL) | [#41](https://github.com/oecher-meeples/portal/issues/41) | **Bewertet, nicht behoben.** ADR 0007 dokumentiert: `@triplit/client` deklariert `AGPL-3.0-only`; `@triplit/db`/`@triplit/logger` haben keine Lizenzangabe (ungünstigster Fall). Bundle-Check nach `pnpm build` zeigt 0 Treffer für `@triplit`/`@daveyplate`/`@neondatabase/auth-ui` im ausgelieferten Code — beantwortet aber nicht, ob diese Pakete zur *Laufzeit* auf dem Server genutzt werden (AGPL §13 greift beim Betrieb). Kein Dependency-Austausch (Auth-Refactor, zu riskant für einen autonomen Lauf). Zusätzlich unabhängig ungeklärt: Repository ist public, `LICENSE` sagt „All rights reserved". **Issue bleibt offen**, braucht eine Entscheidung (Lizenzwechsel oder juristische Bewertung), kein reiner Code-Fix. |
| C-3 (falsche Export-Zusage) | [#48](https://github.com/oecher-meeples/portal/issues/48), [#49](https://github.com/oecher-meeples/portal/issues/49) | ✅ Behoben — Zusage zunächst entfernt, dann durch den tatsächlich gebauten Self-Service-Export (Profilbereich, JSON, Art. 15/20) ersetzt |
| H-2 (Datenarten, Rechtsgrundlagen) | [#48](https://github.com/oecher-meeples/portal/issues/48) | ✅ Behoben — vollständige Datenarten-Liste inkl. Verhaltensdaten, Rechtsgrundlagen (Art. 6 Abs. 1 lit. a/b), Speicherdauern, erweiterte Betroffenenrechte, Auftragsverarbeiter, Cookie-Abschnitt |
| H-3 (Impressum-Platzhalter) | [#48](https://github.com/oecher-meeples/portal/issues/48) | **Strukturiert, nicht vollständig.** Nach § 5 DDG gegliedert (Vereinsname, Anschrift, Vertretungsberechtigte, Kontakt, Registereintrag), „Musterstraße" entfernt. Alle fehlenden Werte als sichtbare `TODO`s markiert — **keine erfundene Adresse.** Issue bleibt offen, bis der Vorstand die realen Daten liefert. |
| M-1, M-2, M-3 (fehlende Attribution) | [#50](https://github.com/oecher-meeples/portal/issues/50) | ✅ Behoben — `THIRD-PARTY-LICENSES.md` reproduzierbar generiert, eigener Abschnitt für MPL/LGPL/CC-BY, im Portal verlinkt |
| M-4 (Freitextfelder/Blob-Bilder bei Anonymisierung) | [#49](https://github.com/oecher-meeples/portal/issues/49) | **Teilweise behoben.** `Post.author` und Marktanzeigen-Bilder (inkl. tatsächlicher Blob-Löschung) sind erledigt. Die übrigen Freitextfelder (`LfgPost`, `MarketListing.description`, `GameHolding.note` etc.) sind **bewusst nicht angefasst** — Löschen zerstört Vereinshistorie, die andere Mitglieder betrifft. Konflikt mit der „namenlos lesbar"-Zusage im Profilbereich als Kommentar an #49 dokumentiert, braucht eine Vorstandsentscheidung zwischen zwei Optionen. |
| M-5 (kein Selbstbedienungs-Löschweg) | [#49](https://github.com/oecher-meeples/portal/issues/49) | **Teilweise behoben.** Löschantrag mit Fristanzeige (Art. 12 Abs. 3) ist live. Automatische Anonymisierung nach Austritt ist als Mechanik fertig und getestet, aber **bewusst deaktiviert** (`MEMBER_DATA_RETENTION_MONTHS = null`) — die Frist selbst ist eine Vorstandsentscheidung (Datenminimierung vs. steuerliche Belegaufbewahrung), keine geratene Zahl. |
| M-6 (Bank-CSV ohne Warnung) | [#49](https://github.com/oecher-meeples/portal/issues/49) | ✅ Behoben — Bestätigungsdialog nennt Anzahl der Klartext-IBANs und Löschpflicht. Offene Zusatzfrage (Datenminimierung: Export auf tatsächlich einzuziehende Mitglieder einschränken?) an #49 kommentiert. |
| L-1 (falsch deklarierte Runtime-Deps) | [#50](https://github.com/oecher-meeples/portal/issues/50) | ✅ Behoben — `@prisma/client`/`better-auth` in `dependencies` |
| L-2 (Instagram-Token im Klartext) | [#54](https://github.com/oecher-meeples/portal/issues/54) (Security-Plan) | ✅ Behoben — bewusst im Security-Teilplan statt hier, wie beide Pläne von Anfang an vorgesehen hatten |
| L-3 (keine Cookie-Angabe) | [#48](https://github.com/oecher-meeples/portal/issues/48) | ✅ Behoben — eigener Cookie-Abschnitt in der Datenschutzerklärung |

**Zusammengefasst:** 8 von 15 Findings vollständig behoben, 4 teilweise (Mechanik fertig, Aktivierung/Vervollständigung braucht eine Entscheidung des Vorstands), 3 bewusst nicht behoben und explizit dokumentiert (AGPL-Bewertung, Impressum-Platzhalter, Freitextfelder). Kein Finding wurde stillschweigend übergangen.

---

## 1. Lizenz-Audit

### Methodik

`pnpm licenses list --prod --json` über den vollständigen transitiven Baum (734 Pakete).
`npx license-checker --production` erfasste nur 21 Top-Level-Pakete und hat die kritischen
Funde **nicht** gesehen — für pnpm-Workspaces ist es unbrauchbar. Jeder kritische Fund wurde
per `pnpm why <paket> --prod` auf seinen Pfad zurückverfolgt.

### Verteilung

| Lizenz                                | Pakete | Einordnung        |
| ------------------------------------- | -----: | ----------------- |
| MIT                                   |    636 | unkritisch        |
| Apache-2.0                            |     33 | unkritisch        |
| ISC                                   |     29 | unkritisch        |
| BSD-3-Clause                          |     12 | unkritisch        |
| BSD-2-Clause                          |      9 | unkritisch        |
| BlueOak-1.0.0                         |      3 | unkritisch        |
| MIT-0 / 0BSD / CC0-1.0 / Unlicense    |      5 | unkritisch        |
| CC-BY-4.0 (`caniuse-lite`)            |      1 | unkritisch (Daten) |
| Python-2.0 (`argparse`)               |      1 | unkritisch        |
| **MPL-2.0**                           |  **5** | **prüfpflichtig** |
| **Apache-2.0 AND LGPL-3.0-or-later**  |  **1** | **prüfpflichtig** |
| **AGPL-3.0-only / -or-later**         |  **2** | **kritisch**      |
| **Unknown**                           |  **3** | **kritisch**      |

Kein GPL-2.0 und kein GPL-3.0 (non-Affero) im Baum.

### C-1 — `@triplit/client@1.0.50`, AGPL-3.0-only · **kritisch**

Auflösungspfad (verifiziert mit `pnpm why`):

```
oecher-meeples (dependencies)
└─ @neondatabase/auth@0.4.2-beta        ← unsere direkte Production-Dependency
   └─ @neondatabase/auth-ui@0.2.1-beta  ← harte dependency, nicht optional
      └─ @daveyplate/better-auth-ui@3.3.9
         └─ @triplit/client@1.0.50      ← AGPL-3.0-only
```

`@neondatabase/auth-ui` steht in `node_modules/@neondatabase/auth/package.json` unter
`dependencies` (nicht `optionalDependencies`, nicht `peerDependencies`) — der AGPL-Teilbaum
ist also bei jeder Installation zwangsläufig da und lässt sich nicht wegkonfigurieren, ohne
das Auth-Paket zu ersetzen.

**Was verifiziert ist:** Der eigene Quellcode importiert `@triplit/*`, `@daveyplate/*` und
`@neondatabase/auth-ui` **nirgends**. Ein `grep` über `src/` findet nur zwei Einstiegspunkte,
und beide gehen an den Server-/Client-Kern, nicht an die UI:

- [src/lib/auth/server.ts:1](src/lib/auth/server.ts#L1) — `@neondatabase/auth/next/server`
- [src/lib/auth/client.ts:3](src/lib/auth/client.ts#L3) — `@neondatabase/auth/next`

**Was nicht verifiziert ist:** Ob der AGPL-Code im gebauten Artefakt landet. Dazu wäre ein
`next build` mit Bundle-Inspektion nötig, der im Rahmen dieses Audits nicht gelaufen ist.

**Warum es trotzdem zählt:** Die AGPL-3.0 §13 löst die Offenlegungspflicht bereits dadurch
aus, dass Nutzer über ein Netzwerk mit dem Programm interagieren — nicht erst durch das
Ausliefern von Binärcode. Genau das ist der Betriebsmodus dieses Portals. Für ein Projekt,
dessen `LICENSE` "All rights reserved" sagt, ist das der maximal ungünstige Fall: greift §13,
müsste der komplette "corresponding source" des Gesamtwerks unter AGPL verfügbar gemacht
werden. Ob das Gesamtwerk hier ein abgeleitetes Werk ist, hängt daran, ob der AGPL-Code
tatsächlich Teil des laufenden Programms ist — genau die Frage, die der Bundle-Check klärt.

### C-2 — `ua-parser-js@2.0.10`, AGPL-3.0-or-later · **kritisch**

Gleicher Pfad über `@neondatabase/auth` → `@neondatabase/auth-ui`, zusätzlich direkt von
`@neondatabase/auth-ui` selbst gezogen.

Dieser Fund ist ausdrücklich zu trennen von C-1: `ua-parser-js` ist seit Version 2.0 bewusst
**dual-licensed** — AGPL-3.0 für die kostenlose Nutzung, daneben eine kommerzielle
PRO-Lizenz. Das ist keine Nachlässigkeit des Autors, sondern ein Geschäftsmodell. Die AGPL
ist hier also die Bedingung, unter der man ohne Zahlung nutzt, und der Autor hat ein aktives
Interesse an ihrer Durchsetzung. Für ein proprietäres Projekt heißt das: entweder die
AGPL-Bedingungen erfüllen (Offenlegung) oder eine kommerzielle Lizenz erwerben — oder die
Dependency loswerden.

### H-1 — `@triplit/db`, `@triplit/logger`, `@triplit/react` · **hoch**

Der Scanner liefert für diese drei "Unknown" — im Paket-Manifest fehlt ein `license`-Feld.
Das ist rechtlich **nicht** "unkritisch", sondern der ungünstigste Ausgangspunkt: ohne
ausdrückliche Lizenz besteht per Urheberrecht überhaupt kein Nutzungsrecht. Da das
Geschwisterpaket `@triplit/client` AGPL-3.0-only ist, ist AGPL für diese drei die
wahrscheinlichste Absicht. Zu klären ist es am Repository, nicht am npm-Manifest.

### M-1 — MPL-2.0 (5 Pakete) · **prüfpflichtig**

| Paket                        | Weg                                   | Tatsächlich genutzt?                                                                    |
| ---------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| `@vercel/og@0.11.1`          | direkte Production-Dependency         | **Ja** — [src/lib/instagram/cover-image.tsx](src/lib/instagram/cover-image.tsx)          |
| `satori@0.25.0`              | via `@vercel/og`                      | ja (transitiv, Runtime)                                                                  |
| `@resvg/resvg-wasm`          | via `@vercel/og`                      | ja (transitiv, Runtime)                                                                  |
| `lightningcss`               | via `vite` → `vitest`                 | nein — nur Build-/Testzeit                                                               |
| `lightningcss-win32-x64-msvc` | dito                                  | nein — nur Build-/Testzeit                                                               |

Die MPL-2.0 ist **dateibezogenes** Copyleft: sie greift auf die MPL-lizenzierten Dateien
selbst, nicht auf das umgebende Werk. Unveränderte Nutzung als Bibliothek — genau der Fall
hier — ist mit proprietärem Code vereinbar. Pflichten: die Lizenz- und Urheberrechtshinweise
erhalten und, falls man eine MPL-Datei ändert, diese Änderung unter MPL offenlegen. Es gibt
keinen Hinweis auf Modifikationen. **Offener Punkt ist allein die fehlende Notices-Datei**
(siehe M-3) — inhaltlich ist die Nutzung unproblematisch.

### M-2 — `@img/sharp-win32-x64@0.34.5`, Apache-2.0 AND LGPL-3.0-or-later · **prüfpflichtig**

Der LGPL-Teil ist das mitgelieferte libvips-Binary. Kommt zweifach herein: über `@vercel/og`
→ `sharp` und über `next` → `sharp`, ist also unvermeidbar.

Das Paket ist ein vorkompiliertes, unverändertes, **dynamisch** geladenes Native-Binary.
Damit sind LGPL §4/§5 der Sache nach erfüllt: Relinking-Fähigkeit ist gegeben, weil die
Bibliothek separat austauschbar bleibt. Praktisch bleibt nur die Attributionspflicht, und die
greift erst bei Weitergabe. Bei einem Vercel-gehosteten SaaS findet keine Weitergabe von
Kopien an Nutzer statt → **geringes praktisches Risiko**. Die Plattform-Variante ist
außerdem `win32-x64`, also die Entwicklungsmaschine; im Vercel-Deployment kommt
`linux-x64` mit derselben Lizenzlage.

### M-3 — Keine Attributionsdatei · **mittel**

Es existiert weder `NOTICE`, `THIRD-PARTY-LICENSES` noch ein Attributionsabschnitt in
`README.md` oder in der App. MIT verlangt, dass Copyright- und Lizenzhinweis "in all copies
or substantial portions" mitgeführt werden; Apache-2.0 §4 verlangt zusätzlich die Weitergabe
einer vorhandenen NOTICE-Datei. Bei reinem SaaS-Betrieb ist strittig, ob überhaupt eine
"Kopie" weitergegeben wird — die Pflicht greift dann kaum. Hier kommt aber hinzu, dass das
Repository laut eigener `LICENSE` Dritten (Prüfenden des Kurses) zur Ansicht offensteht.
Eine generierte `THIRD-PARTY-LICENSES.md` kostet wenig und schließt den Punkt vollständig.

### L-1 — Runtime-Pakete unter `devDependencies` · **niedrig (aber methodisch relevant)**

[package.json:47](package.json#L47) und [package.json:57](package.json#L57) führen
`@prisma/client@6.19.3` und `better-auth@1.4.18` unter `devDependencies`, obwohl beide zur
Laufzeit gebraucht werden (`@prisma/client` in jedem Query-Modul, `better-auth` als Kern von
`@neondatabase/auth`).

Zwei Folgen: erstens ist damit **jeder** `--production`-Lizenzscan strukturell unzuverlässig,
weil die Grenze zwischen ausgeliefertem und nur gebautem Code im Manifest falsch gezogen ist
— das erklärt auch, warum in der `--prod`-Ausgabe `vitest`, `tsx` und `prettier` auftauchen.
Zweitens ist es ein Deployment-Risiko, sobald irgendwo mit `--prod` installiert wird.

---

## 2. Datenschutz-Audit

Das Projekt verarbeitet personenbezogene Daten — dieser Abschnitt ist voll anwendbar. Der
Verantwortliche ist ein deutscher Verein mit Sitz in Aachen, es gilt DSGVO + BDSG.

### Tatsächlich gespeicherte personenbezogene Daten

Aus [prisma/schema.prisma](prisma/schema.prisma):

| Modell                       | Personenbezogene Felder                                                                                        | Kategorie                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `Meeple` (:111)              | `displayName`, `email`, `memberNumber`, `joinedAt`, `resignedAt`, `membershipEndsAt`                            | Stammdaten                   |
| `Meeple`                     | `ibanEncrypted`, `ibanLast4`, `accountHolder`                                                                   | **Finanzdaten**              |
| `Meeple`                     | `telegramHandle`, `signalHandle`, `discordHandle`, `bggUsername`, `bgaUsername`                                 | Kontakt-/Plattformkennungen  |
| `BankDataAccessLog` (:187)   | `accessedByMeepleId`, `subjectMeepleId`, `at`, `kind`                                                           | Zugriffsprotokoll            |
| `GameHolding` (:397)         | `meepleId`, `recordedByMeepleId`, Zeitraum, `note`                                                              | Verleihhistorie (Verhalten)  |
| `ShiftBooking` (:475)        | `meepleId`, `uncertain`                                                                                         | Anwesenheit/Engagement       |
| `LfgPost` / `LfgParticipant` | Ersteller, Teilnehmer, `plannedAt`, `location`, Freitext                                                        | Sozialgraph                  |
| `ExplainerGame` / `-Attendance` | `meepleId`, `boardGameId`, `level`, Event-Anwesenheit                                                        | Fähigkeiten + Anwesenheit    |
| `FleaMarketItem` (:520)      | `sellerMeepleId`, `approvedByMeepleId`, Preise                                                                  | Transaktionsdaten            |
| `MarketListing` (:298)       | `sellerMeepleId`, `imageUrls`, Preise                                                                           | Transaktionsdaten + Bilder   |
| `SparePartListing` (:278)    | `keeperMeepleId`                                                                                                | Besitzzuordnung              |
| `StorageUnit` / `-Move`      | `keeperMeepleId`, `locationNote`, Zeitraum                                                                      | Aufenthalt von Vereinsgut    |
| `PrivateGameCollectionEntry` | `meepleId` + private Spielesammlung                                                                             | Privatbesitz                 |
| `Post` (:202)                | `author` (Freitext-Name)                                                                                        | Urheberangabe                |
| `neon_auth.user/account/session` | Login-Identität, Sessions (extern verwaltet, Neon)                                                          | Authentifizierung            |

Der Kern der Lücke: neben den Stammdaten entsteht hier ein recht dichtes **Verhaltensprofil**
pro Mitglied (wer war wann da, wer hat welches Spiel wie lange, wer sucht mit wem Mitspieler).
Genau davon steht in der Datenschutzerklärung nichts.

### C-3 — Datenschutzerklärung verspricht einen nicht existierenden Export · **kritisch**

[src/data/legal.ts:52](src/data/legal.ts#L52) sagt wörtlich:

> "Mitglieder können jederzeit Auskunft über die gespeicherten Daten verlangen und **einen
> Export über den eigenen Profilbereich anfordern**."

Diese Funktion existiert nicht. Verifiziert:

- `src/components/feature/profil/` enthält `profil-view.tsx`, `actions.ts`,
  `bank-details-form.tsx`, `profile-details-form.tsx`, `resign-membership-panel.tsx` — keine
  Export-Komponente, keine Export-Action.
- Die einzige Exportfunktion im gesamten Projekt ist `exportBankDataCsv()` in
  [src/components/feature/admin-bank/actions.ts:50](src/components/feature/admin-bank/actions.ts#L50)
  — eine Admin-Funktion für den Beitragseinzug, kein Betroffenen-Auskunftsexport.
- Der Datenschutz-Abschnitt in
  [src/components/feature/profil/profil-view.tsx:108-123](src/components/feature/profil/profil-view.tsx#L108-L123)
  listet drei Hinweise zu Verschlüsselung, Löschung und Protokollaufbewahrung — von einem
  Export ist dort konsequent keine Rede.

Zwei getrennte Probleme in einem: die Datenschutzerklärung enthält eine **unwahre Aussage**
über die Verarbeitung (die Erklärung ist selbst ein rechtlich relevantes Dokument), und das
Auskunfts-/Portabilitätsrecht nach Art. 15/20 DSGVO ist unerfüllt. Ein Auskunftsersuchen
müsste heute per Hand aus 15 Tabellen zusammengetragen werden — innerhalb der Monatsfrist
des Art. 12 Abs. 3.

### H-2 — Datenschutzerklärung materiell unvollständig · **hoch**

[src/data/legal.ts:44](src/data/legal.ts#L44) nennt als verarbeitete Daten ausschließlich
"Name, E-Mail-Adresse und, sofern für den SEPA-Lastschrifteinzug erforderlich,
Bankverbindungen". Gegenüber der Tabelle oben fehlen: Messenger-Handles, Plattform-Kennungen,
Mitgliedsnummer, Verleihhistorie, Schichtbuchungen, Erklärbär-Anwesenheit,
Mitspielsuche-Teilnahmen, Flohmarkt- und Marktangebote inklusive Bildern sowie die private
Spielesammlung.

Ebenfalls nicht vorhanden, obwohl Art. 13 DSGVO sie zwingend verlangt:

- Rechtsgrundlagen je Zweck (Art. 6 — Mitgliedsvertrag vs. berechtigtes Interesse vs.
  Einwilligung, etwa bei den freiwilligen Messenger-Handles)
- Speicherdauern bzw. Kriterien dafür (die 24 Monate für Zugriffsprotokolle sind der einzige
  genannte Zeitraum, und der steht nur im Profil-UI, nicht in der Erklärung)
- Empfänger/Auftragsverarbeiter — real sind das mindestens **Neon** (Datenbank + Auth),
  **Vercel** (Hosting + Blob-Speicher für Bilder) und **Meta** (Instagram-Cross-Posting).
  Zu keinem gibt es eine Nennung oder einen Hinweis auf einen AV-Vertrag nach Art. 28.
- Beschwerderecht bei der Aufsichtsbehörde (Art. 13 Abs. 2 lit. d)
- Widerrufsrecht bei Einwilligungen (Art. 7 Abs. 3)
- Berichtigungs-, Einschränkungs- und Widerspruchsrecht (Art. 16, 18, 21) — genannt sind nur
  Auskunft und der nicht existierende Export

### H-3 — Impressum ist Platzhalter · **hoch**

[src/data/legal.ts:56-71](src/data/legal.ts#L56-L71) enthält "Musterstraße 1, 52062 Aachen",
"Platzhalter – finale Angaben folgen." und "vorstand@oecher-meeples.de (Platzhalter)".

Die Route [src/app/rechtliches/[slug]/page.tsx](src/app/rechtliches/[slug]/page.tsx) ist
öffentlich (`proxy.ts` schützt nur `/admin`) und wird via `generateStaticParams()` statisch
vorgeneriert — das Platzhalter-Impressum ist also live abrufbar. § 5 DDG verlangt für ein
geschäftsmäßiges Angebot eine ladungsfähige Anschrift und den Vertretungsberechtigten;
fehlende oder falsche Angaben sind abmahnfähig. Für den Prototyp-Status ist das vertretbar,
vor dem ersten echten Publikumszugang nicht mehr.

### M-4 — Anonymisierung lässt Freitext und Bilder stehen · **mittel**

`anonymiseMeeple()` in
[src/components/feature/admin-mitglieder/actions.ts:59-116](src/components/feature/admin-mitglieder/actions.ts#L59-L116)
arbeitet sauber und gründlich: es löscht in einer Transaktion die Neon-Auth-Zeilen
(`session`, `account`, `user`) und nullt anschließend `email`, `accountHolder`,
`ibanEncrypted`, `ibanLast4`, `bggUsername`, `bgaUsername`, `telegramHandle`, `signalHandle`,
`discordHandle` und `neonAuthUserId`, setzt `displayName` auf `"(anonymisiert)"`. Die
strukturierten PII-Felder sind damit vollständig erfasst.

Was bleibt, sind Felder, in die Menschen erfahrungsgemäß Namen schreiben:

| Feld                             | Schema         |
| -------------------------------- | -------------- |
| `LfgPost.title`, `.description`  | :156, :158     |
| `MarketListing.title`, `.description` | :301, :302 |
| `SparePartListing.description`   | :282           |
| `GameHolding.note`               | :408           |
| `StorageUnitMove.locationNote`   | :381           |
| `StorageUnit.locationNote`       | :358           |
| `Post.author`                    | :210           |

Dazu `MarketListing.imageUrls` (:305): Fotos liegen in Vercel Blob, hängen weiter am
anonymisierten Meeple und werden nie gelöscht — Bilder können identifizierend sein, und
Blob-URLs sind ohne Auth erreichbar.

Das Profil-UI verspricht dagegen ausdrücklich
([profil-view.tsx:117-119](src/components/feature/profil/profil-view.tsx#L117-L119)):
"Nach einem Austritt werden Konto, Name und Kontaktdaten gelöscht […] Aufenthalte und Gesuche
bleiben dann **namenlos** lesbar." Steht in einem Gesuch ein Name im Freitext, ist es nicht
namenlos.

### M-5 — Kein Selbstbedienungs-Löschweg, keine automatische Frist · **mittel**

`anonymiseMeeple()` verlangt `requireMembersManage()` und den Zustand `ausgetreten`
(actions.ts:60, :69). Beides ist sachlich richtig — offene Vereinsspiele werden korrekt
geblockt (:73-84) — hat aber zwei Folgen:

1. Ein Art.-17-Verlangen ist eine manuelle Admin-Handlung. Es gibt keinen Antrag, keine
   Warteschlange, keine Frist, kein Nachverfolgen. Ob innerhalb eines Monats reagiert wurde,
   ist im System nicht ablesbar.
2. Es anonymisiert nichts von selbst. Ein Mitglied, das vor Jahren ausgetreten ist, bleibt
   mit Klarnamen, E-Mail, Handles und verschlüsselter IBAN gespeichert, bis jemand
   daran denkt. Für Finanzdaten nach Ende des Beitragsverhältnisses ist das der kritische
   Teil — hier fehlt eine Aufbewahrungsfrist-Logik, wie sie für `BankDataAccessLog` schon
   existiert (siehe "Verified clean").

### M-6 — Bank-CSV mit Klartext-IBAN ohne Inhaltswarnung · **mittel**

`exportBankDataCsv()`
([admin-bank/actions.ts:50-84](src/components/feature/admin-bank/actions.ts#L50-L84))
entschlüsselt die IBANs **aller** nicht-anonymisierten Mitglieder und legt sie zusammen mit
`accountHolder` in eine unverschlüsselte CSV, die im Browser heruntergeladen wird
(`filename: "beitragseinzug.csv"`, `BANK_CSV_COLUMNS` enthält `"IBAN"`).

Positiv und ausdrücklich anzuerkennen: der Zugriff ist permissionsgeschützt und wird als
`BankDataAccessKind.CSV_EXPORT` protokolliert (:77). Für den SEPA-Einzug ist ein solcher
Export auch fachlich nötig, das ist kein Designfehler.

Die Lücke ist die Übergabe: sobald die Datei auf dem Rechner des Kassenwarts liegt, endet
jede technische Kontrolle, und die UI sagt an keiner Stelle, was in der Datei steht oder wie
mit ihr umzugehen ist. Ein Bestätigungsdialog mit Klartext-Hinweis ("enthält N unverschlüsselte
IBANs, nach Verwendung löschen") ist geringer Aufwand und schließt die Lücke organisatorisch.
Zu prüfen wäre außerdem, ob eine Einschränkung auf tatsächlich einzuziehende Mitglieder den
Umfang reduzieren kann (Datenminimierung, Art. 5 Abs. 1 lit. c).

### L-2 — Inkonsistente Secret-Behandlung · **niedrig** (Querverweis)

`InstagramConnection.accessToken` ([schema.prisma:544](prisma/schema.prisma#L544)) liegt im
Klartext in der Datenbank, während IBANs im selben Schema AES-256-GCM-verschlüsselt sind.
Der Token ist kein personenbezogenes Datum, deshalb hier nur als Randnotiz — die
eigentliche Bewertung gehört in `/audit-security`. Auffällig ist die Inkonsistenz: der
Verschlüsselungsbaustein (`encryptSecret`) existiert und wäre direkt anwendbar.

### L-3 — Cookies nicht erwähnt · **niedrig**

Die Datenschutzerklärung sagt nichts über Cookies. Materiell ist die Lage günstig: es gibt
kein Analytics und kein Tracking (siehe "Verified clean"), gesetzt werden nur Auth-Cookies
von Neon Auth. Die sind technisch notwendig i. S. v. § 25 Abs. 2 TDDDG und brauchen **kein**
Consent-Banner. Ein kurzer Absatz "wir setzen nur technisch notwendige Session-Cookies, kein
Tracking" gehört aber in die Erklärung — und ist zugleich ein positives Verkaufsargument.

---

## Verified clean

Explizit geprüft und in Ordnung — nicht stillschweigend übergangen:

**Kein Telemetrie-Risiko.** Grep über `package.json` **und** `src/` nach `sentry`,
`analytics`, `amplitude`, `mixpanel`, `segment`, `posthog`, `gtag`, `googletagmanager`,
`plausible`, `umami`, `datadog`, `logrocket`, `hotjar`: **null Treffer** in beiden. Es gibt
kein Analytics-, Tracking- oder Crash-Reporting-SDK. Das ist die datenschutzfreundlichste
mögliche Ausgangslage und erspart Consent-Management vollständig.

**IBAN-Verschlüsselung ist solide umgesetzt.**
[src/lib/utils/crypto.ts](src/lib/utils/crypto.ts): AES-256-GCM, pro Wert ein frischer
12-Byte-IV aus `randomBytes`, Auth-Tag wird beim Entschlüsseln geprüft, Versionspräfix `v1`
für spätere Rotation, Schlüssel aus `MEMBER_DATA_ENCRYPTION_KEY` mit Längenvalidierung auf
32 Byte. Der Schlüssel wird nirgends geloggt; die Fehlermeldungen nennen ihn nur beim Namen.
Kein Eigenbau-Kryptoverfahren, keine statische IV, kein ECB. `ibanLast4` ist bewusst im
Klartext und dokumentiert. Auch die IBAN-Validierung (`isValidIban`, ISO 13616 + mod-97) ist
dependency-frei selbst gebaut und korrekt.

**Jeder Klartext-Lesezugriff auf Bankdaten wird protokolliert.** Beide Wege — `revealIban()`
(Einzelabruf) und `exportBankDataCsv()` (Massenexport) — schreiben nach `BankDataAccessLog`
mit unterschiedlichem `kind`. Der Audit-Trail ist damit lückenlos.

**Die 24-Monats-Aufbewahrungsfrist ist wirklich durchgesetzt, nicht nur dokumentiert.**
`deleteExpiredBankDataAccessLogs()` in
[src/lib/members/bank-access-log.ts:31](src/lib/members/bank-access-log.ts#L31) ist im
täglichen Vercel-Cron verdrahtet: `vercel.json` → `/api/cron/instagram-queue` (`0 5 * * *`)
→ Import in [route.ts:3](src/app/api/cron/instagram-queue/route.ts#L3). Das ist der Fall, der
in Audits meistens negativ ausgeht (Konstante ohne Aufrufer) — hier läuft er.

**Plattform-Kennungen verlassen das System nicht.** `bggUsername` und `bgaUsername` erscheinen
ausschließlich in Profilformular, Profil-Ansicht, der Profil-Action und im Anonymisierungspfad.
Kein ausgehender Aufruf an `boardgamegeek.com` trägt sie mit — die BGG-Anbindung holt nur
Spieldaten.

**Der öffentliche Gastbereich gibt keine Mitgliedsidentität preis.**
`getGuestFleaMarketItems()`
([src/lib/events/guest-area.ts:155-170](src/lib/events/guest-area.ts#L155-L170)) selektiert
explizit nur `id`, `title`, `description`, `priceEuros`, `status` — `sellerMeepleId` ist
bewusst nicht dabei. Die Seite [src/app/events/[slug]/gast/page.tsx](src/app/events/[slug]/gast/page.tsx)
mappt Spiele ebenfalls nur auf Titel und Spielerzahl. Für eine ohne Login erreichbare Seite
genau richtig.

**Instagram-Cross-Posting überträgt keine Mitglieder-PII.** In `src/lib/instagram/` gibt es
keinen Zugriff auf `Post.author` oder ein Meeple-Feld. An Meta gehen Beitragsinhalt,
Coverbild und der Rücklink.

**Dass `proxy.ts` nur `/admin` prüft, ist keine Exposition.** Jede
mitgliederbezogene Seite erzwingt ihren Schutz selbst per `requireMember()` — geprüft und
bestätigt für `/lfg`, `/lfg/[id]`, `/markt`, `/markt/[id]`, `/profil`, `/erklaerbaeren`,
`/helfer`, `/statistiken`, `/dashboard`. Der Kommentar in
[src/proxy.ts:7](src/proxy.ts#L7) beschreibt das Modell zutreffend.

**Keine echten Secrets im Repo.** `.env.example` enthält durchweg Platzhalter
(`generate-with-openssl-rand-base64-32`, `admin@example.com`, `change-me`) und dokumentiert
sogar die Schlüsselverwaltung samt Warnung, dass ein Verlust des Schlüssels alle IBANs
unwiederbringlich macht.

**Kein GPL-2.0/GPL-3.0.** Außer den beiden AGPL-Funden ist im gesamten 734-Pakete-Baum keine
klassische GPL-Dependency.

---

## Empfohlene Reihenfolge

1. **C-1/C-2/H-1 zusammen klären** — es ist ein einziger Auflösungspfad
   (`@neondatabase/auth-ui`). Erster Schritt ist ein Bundle-Check gegen das Build-Artefakt:
   landet AGPL-Code im laufenden Programm oder nicht? Die Antwort entscheidet, ob es ein
   Formalfund oder ein echtes Lizenzproblem ist.
2. **H-3 Impressum** — kleinster Aufwand, öffentlich sichtbar, abmahnfähig.
3. **C-3** — entweder den Export bauen oder die Behauptung aus der Erklärung entfernen. Die
   unwahre Aussage ist das dringlichere von beidem und in Minuten behoben.
4. **H-2** — Datenschutzerklärung an die tatsächliche Verarbeitung angleichen.
5. **M-4/M-5/M-6**, dann M-1/M-3 (Notices generieren), L-1, L-2, L-3.

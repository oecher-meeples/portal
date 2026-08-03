# Ausführungsplan — Umsetzung Compliance-Audit 2026-08-03

- **Grundlage:** [`.claude/audits/2026-08-03_AUDIT_COMPLIANCE.md`](../audits/2026-08-03_AUDIT_COMPLIANCE.md)
- **Issues:** #48 (`docs`+`ready`), #50 (`docs`+`ready`), #41 (`chore`+`needs-refinement`), #49 (`feature`+`needs-refinement`) — alle Kinder von #21
- **Mitgepflegt:** #4 kommentiert (Consent-Banner nicht erforderlich), #21 als Epic mit Kind-Verlinkung neu geschrieben
- **Git-Basis:** Branch `app-akademie`, HEAD `525f40f`, Working Tree dirty (11 M, 2 ??)
- **Ziel:** Die veröffentlichten Rechtstexte sagen die Wahrheit, die Lizenzlage ist entschieden und belegbar, und Betroffenenrechte sind nicht mehr Handarbeit.

## Leitidee

Zwei Arten von Befunden, die verschiedene Behandlung brauchen.

Die eine Hälfte ist **eine öffentlich abrufbare Falschaussage** — die Datenschutzerklärung verspricht einen Datenexport, den es nicht gibt, und das Impressum ist ein Platzhalter. Das kostet fast keinen Aufwand und ist reine Textarbeit, hat aber die kürzeste Zündschnur, weil es live steht. Das geht zuerst, unabhängig von allem anderen.

Die andere Hälfte hängt an **Entscheidungen, die nicht im Code liegen**: greift die AGPL-Kette (Tatsachenfrage, dann ggf. juristisch), und wie lange bleiben Mitgliedsdaten nach dem Austritt gespeichert (Vorstandsfrage, mit steuerlicher Aufbewahrung im Konflikt). Diese Phasen beginnen mit Klärung, nicht mit Code — und der Plan darf sie nicht überspringen, indem er eine Frist einfach annimmt.

```
Phase 1 (#48)  ─ Textarbeit, sofort, blockiert nichts
Phase 2 (#41)  ─ Entscheidungsgate: Bundle-Check → Lizenzentscheidung
                     ↓ (Ergebnis kann Dependencies ändern)
Phase 3 (#50)  ─ Attribution generieren, erst nach Phase 2 sinnvoll
Phase 4 (#49)  ─ Feature-Arbeit, braucht Vorstandsentscheidung vorab
```

**Warum #50 nach #41:** Entscheidet Phase 2, `@neondatabase/auth` zu ersetzen, ändert sich der halbe Dependency-Baum — eine vorher generierte `THIRD-PARTY-LICENSES.md` wäre sofort falsch. Der Teilschritt „Runtime-Deps korrekt deklarieren" aus #50 ist davon unabhängig und wird deshalb nach vorne gezogen (Schritt 2.1).

**Abhängigkeit nach außen:** Der Bundle-Check in Phase 2 braucht einen funktionierenden `next build`. Ob der auf diesem Stand läuft, ist offen — der Prozess-Audit-Plan ([`2026-08-03_prozess-audit-umsetzung.md`](2026-08-03_prozess-audit-umsetzung.md), Phase 1/2a) klärt genau das. Läuft `next build` lokal nicht, ist das dort ein Issue und hier ein Blocker, kein Nebenfix.

---

## Phase 1 — Rechtstexte wahrheitsgemäß machen (#48) 🔴 zuerst

Reine Inhaltsarbeit in [`src/data/legal.ts`](../../src/data/legal.ts). Kein Schema, keine Komponente, kein Test — die Datei ist ein statisches `Record`, das über `/rechtliches/[slug]` per `generateStaticParams()` vorgeneriert wird.

### 1a — Die Falschaussage entfernen (Finding C-3, Textteil)

- [ ] **1.1** [`legal.ts:52`](../../src/data/legal.ts#L52) — die Zusage „einen Export über den eigenen Profilbereich anfordern" streichen und durch den real existierenden Weg ersetzen (Auskunft auf Anfrage beim Vorstand, Kontaktadresse aus dem Impressum). **Zuerst dieser Schritt**, weil er allein schon die unwahre Aussage beseitigt und in Minuten erledigt ist.
- [ ] **1.2** Gegenprobe, dass keine weitere Zusage im UI unbelegt ist: [`profil-view.tsx:108-123`](../../src/components/feature/profil/profil-view.tsx#L108-L123) nennt Verschlüsselung, Löschung bei Austritt und 24 Monate Protokollaufbewahrung — alle drei sind laut Audit korrekt implementiert, dürfen also stehen bleiben. Die Formulierung „namenlos lesbar" (:117-119) ist die eine, die Phase 4 noch einlösen muss.

### 1b — Datenschutzerklärung vervollständigen (Finding H-2)

Vorlage ist die Datenarten-Tabelle im Audit-Bericht, Abschnitt 2. Sie ist aus [`prisma/schema.prisma`](../../prisma/schema.prisma) abgeleitet und kann direkt übernommen werden.

- [ ] **1.3** Abschnitt „2. Verarbeitete Daten" ersetzen: Stammdaten, Finanzdaten, Kontakt-/Plattformkennungen — und ausdrücklich die **Verhaltensdaten** (Verleihhistorie, Schichtbuchungen, Erklärbär-Anwesenheit, Mitspielsuche, Flohmarkt/Markt inkl. Bilder, private Spielesammlung). Der Punkt ist nicht Vollständigkeitsfetischismus: dass ein dichtes Verhaltensprofil entsteht, ist die eigentliche Nichtoffenlegung.
- [ ] **1.4** Neuer Abschnitt Rechtsgrundlagen (Art. 6) je Zweck. Trennlinie beachten: Mitgliedsverwaltung und Beitragseinzug laufen über den Mitgliedsvertrag, die freiwilligen Messenger-Handles über Einwilligung — das macht Schritt 1.6 (Widerrufsrecht) überhaupt nötig.
- [ ] **1.5** Neuer Abschnitt Speicherdauern. Die 24 Monate für `BankDataAccessLog` stehen bisher nur im Profil-UI; Quelle ist `BANK_LOG_RETENTION_MONTHS` in [`bank-access-log.ts:5`](../../src/lib/members/bank-access-log.ts#L5). Die Frist für Stammdaten nach Austritt bleibt hier **offen** und wird in Phase 4 nachgetragen — nicht raten.
- [ ] **1.6** Betroffenenrechte vollständig: Art. 15, 16, 17, 18, 20, 21, Widerruf nach Art. 7 Abs. 3, Beschwerderecht bei der Aufsichtsbehörde nach Art. 13 Abs. 2 lit. d.
- [ ] **1.7** Neuer Abschnitt Auftragsverarbeiter: **Neon** (Datenbank + Auth), **Vercel** (Hosting + Blob-Speicher), **Meta** (Instagram-Cross-Posting). Belegbar aus `.env.example` und [`src/lib/instagram/graph-client.ts:1`](../../src/lib/instagram/graph-client.ts#L1).
- [ ] **1.8** Cookie-Abschnitt ergänzen (Finding L-3, gehört fachlich zu #4): nur technisch notwendige Session-Cookies von Neon Auth, kein Tracking. Audit-Belege stehen im Kommentar zu #4 — **kein** Consent-Banner bauen.
- [ ] **Commit:** `docs: align privacy policy with what the code actually processes`

> **AV-Verträge nach Art. 28 sind Vereinsarbeit, nicht Entwicklungsarbeit.** Der Code kann sie nur benennen. Als offener Punkt in #48 kommentieren, nicht stillschweigend abhaken.

### 1c — Impressum (Finding H-3)

- [ ] **1.9** [`legal.ts:56-71`](../../src/data/legal.ts#L56-L71) mit echten Vereinsdaten füllen: ladungsfähige Anschrift, Vertretungsberechtigte, Kontakt, bei eingetragenem Verein Registergericht + Registernummer.
- [ ] **1.10** Prüfen, ob der Verein zum Zeitpunkt der Umsetzung schon eingetragen ist. Falls nicht, ist „e. V." im Namen ([`legal.ts:13`](../../src/data/legal.ts#L13)) selbst angreifbar — dann als Vorgründungsstatus formulieren, statt einen nicht existierenden Registereintrag zu behaupten.
- [ ] **1.11** Grep über `src/data/legal.ts` nach `Platzhalter` und `Muster` — muss außer in der Satzung (dort laut Kommentar bis zur Gründung beabsichtigt) leer sein.
- [ ] **Commit:** `docs: replace placeholder Impressum with real association data`

> **Abbruchkriterium:** Liegen die echten Vereinsdaten nicht vor, wird 1c abgebrochen und in #48 kommentiert — **nicht** durch einen plausibler klingenden Platzhalter ersetzt. Ein falsches Impressum ist schlechter als ein offensichtlich unfertiges.

---

## Phase 2 — AGPL-Kette entscheiden (#41)

Entscheidungsgate. Beginnt mit einer Tatsachenfeststellung, nicht mit Code — bevor die nicht steht, ist jede Maßnahme geraten.

### 2a — Vorarbeit, unabhängig vom Ergebnis (Finding L-1)

- [ ] **2.1** `@prisma/client` und `better-auth` in [`package.json`](../../package.json) von `devDependencies` nach `dependencies` verschieben (:47, :57). Beide werden zur Laufzeit gebraucht. **Zuerst**, weil jede `--prod`-Auswertung sonst strukturell falsch bleibt — daran hängen Schritt 2.2 und ganz Phase 3.
- [ ] **2.2** `pnpm install`, dann `pnpm run verify`. Danach `pnpm licenses list --prod` erneut: `vitest`, `tsx` und `prettier` dürfen in der Ausgabe nicht mehr auftauchen. Tun sie es doch, ist eine weitere Runtime-Dependency falsch deklariert — dann suchen, nicht ignorieren.
- [ ] **2.3** Script `licenses` in `package.json` ergänzen (`pnpm licenses list --prod`). In [`CLAUDE.md`](../../CLAUDE.md) unter „Vor dem Push" oder als eigener Punkt festhalten, **dass `license-checker` bei pnpm unbrauchbar ist** — es findet nur 21 von 734 Paketen und keinen der kritischen Funde. Ohne diese Notiz wiederholt der nächste Durchlauf den Fehler.
- [ ] **Commit:** `chore: declare runtime deps correctly and add license listing script`

### 2b — Die Tatsachenfrage (Findings C-1, C-2, H-1)

- [ ] **2.4** `pnpm build` ausführen. **Läuft er nicht, hier stoppen** — das ist Phase 1/2a des Prozess-Audit-Plans, nicht dieses Issue.
- [ ] **2.5** Im Artefakt (`.next/`) nach Code aus `@triplit`, `ua-parser-js`, `@daveyplate` und `@neondatabase/auth-ui` suchen — Server- **und** Client-Bundles getrennt. Erwartung aus dem Audit: nicht enthalten, weil `src/` sie nirgends importiert. Erwartung ist aber kein Beleg, deshalb dieser Schritt.
- [ ] **2.6** Lizenz von `@triplit/db`, `@triplit/logger`, `@triplit/react` am Upstream-Repository klären — nicht am npm-Manifest, dort fehlt das Feld. Ohne ausdrückliche Lizenz besteht per Urheberrecht **kein** Nutzungsrecht; das ist der ungünstigste Ausgangspunkt, nicht der harmloseste.
- [ ] **2.7** Ergebnis in #41 kommentieren, mit Belegen. Das ist der Übergabepunkt für alles Weitere.

### 2c — Die Entscheidung

Genau einer der drei Zweige, dokumentiert unter `docs/` oder als ADR (das Repo hat `docs/adr/`, dort passt es besser).

- [ ] **2.8a** *Bundle sauber:* Als bewusst getragenes Restrisiko festhalten. Begründung muss ausdrücklich auf AGPL §13 eingehen — die Netzwerk-Klausel greift beim Betrieb, nicht erst beim Ausliefern, und ist der Grund, warum „ist nicht gebundelt" allein nicht trägt.
- [ ] **2.8b** *Bundle betroffen:* `@neondatabase/auth` gegen direktes `better-auth` tauschen (steht schon im Baum, siehe 2.1). Betroffen sind [`src/lib/auth/server.ts`](../../src/lib/auth/server.ts), [`src/lib/auth/client.ts`](../../src/lib/auth/client.ts) und [`src/proxy.ts`](../../src/proxy.ts). **Der Workaround in `proxy.ts:31-41` für den `@neondatabase/auth`-Bug (0.4.2-beta) wird dabei überflüssig** — er hat einen Regressionstest in [`src/proxy.test.ts:63`](../../src/proxy.test.ts#L63), der mit entfernt werden muss, sonst testet er ins Leere.
- [ ] **2.8c** *Ersatz nicht praktikabel:* Kommerzielle `ua-parser-js`-Lizenz prüfen (seit 2.0 bewusst dual-licensed, AGPL-oder-zahlen) und juristische Einschätzung zur AGPL-Kette einholen. Kostenpunkt in #41 dokumentieren.
- [ ] **2.9** Widerspruch klären, unabhängig vom gewählten Zweig: Das Repository ist **public**, [`LICENSE`](../../LICENSE) sagt „All rights reserved" und räumt nur akademische Ansicht ein. Beide Aussagen zusammen sind widersprüchlich, und die beabsichtigte Lizenzierung geht in die AGPL-Bewertung ein. Entscheidung in #21 festhalten.
- [ ] **Commit:** je Zweig unterschiedlich — `docs: record AGPL dependency assessment` oder `refactor(auth): replace @neondatabase/auth with better-auth to drop AGPL subtree`

---

## Phase 3 — OSS-Attribution (#50)

Erst jetzt, weil 2.8b den Baum umbauen würde. Der Rest von #50 (Schritt 2.1–2.3) ist bereits erledigt.

- [ ] **3.1** `THIRD-PARTY-LICENSES.md` generieren: Paket → Version → Lizenz → Lizenztext oder Link. Grundlage `pnpm licenses list --prod --json` (Stand Audit: 734 Pakete).
- [ ] **3.2** Die prüfpflichtigen Pakete ausdrücklich mit aufführen, nicht in der MIT-Masse verstecken: 5 × MPL-2.0 (`@vercel/og`, `satori`, `@resvg/resvg-wasm`, `lightningcss` ×2) und `@img/sharp-*` (Apache-2.0 AND LGPL-3.0-or-later). Beide Gruppen sind laut Audit inhaltlich unproblematisch — unveränderte Bibliotheksnutzung, dynamisch geladenes Binary — es fehlt nur die Nennung.
- [ ] **3.3** `caniuse-lite` (CC-BY-4.0) mit Urhebernennung aufführen. CC-BY verlangt sie ausdrücklich, anders als MIT.
- [ ] **3.4** Generierung als `package.json`-Script festhalten, damit die Datei bei Dependency-Änderungen nicht driftet. Erwägen, sie in `pnpm run verify` oder die CI zu hängen — sonst ist sie in drei Monaten veraltet.
- [ ] **3.5** Verlinken: neue Sektion unter `/rechtliches` (Muster ist `LEGAL_DOCS` in [`src/data/downloads.ts`](../../src/data/downloads.ts)) oder Abschnitt im Impressum. Damit ist „Verwendete Bibliotheken referenzieren" aus #21 erledigt.
- [ ] **Commit:** `docs: add third-party license attribution`

> **Abgrenzung:** Nur Software-Dependencies. Bildquellen sind #1, Personenfotos #22.

---

## Phase 4 — Betroffenenrechte (#49)

Die einzige echte Feature-Phase. Beginnt mit Fragen, die der Vorstand beantworten muss — Code, der eine Frist annimmt, ist schlimmer als kein Code, weil er die Annahme unsichtbar macht.

### 4a — Entscheidungen einholen 🔴 vor jeder Zeile Code

- [ ] **4.1** **Aufbewahrungsfrist nach Austritt.** Der Konflikt ist echt: Datenminimierung (Art. 5 Abs. 1 lit. c) drängt auf Löschen, steuerliche und handelsrechtliche Aufbewahrung von Beitragsbelegen kann Jahre verlangen. Getrennte Fristen für Stammdaten und Finanzdaten sind wahrscheinlich die richtige Antwort. Ergebnis in #49 kommentieren und in Schritt 1.5 nachtragen.
- [ ] **4.2** **Freitextfelder.** Löschen, überschreiben oder stehen lassen? Löschen zerstört Vereinshistorie, die andere Mitglieder betrifft (Gesuche, Notizen an Spielen). Bleibt sie stehen, muss die Zusage „namenlos lesbar" in [`profil-view.tsx:117-119`](../../src/components/feature/profil/profil-view.tsx#L117-L119) relativiert werden — eines von beidem muss weichen.
- [ ] **4.3** **Export-Format und IBAN darin.** JSON für Art. 20; für die IBAN empfiehlt das Audit nur `ibanLast4` plus Hinweis, dass die vollständige IBAN auf Anfrage kommt — eine unverschlüsselte Volldatei mit IBAN wäre ein neues Problem, kein gelöstes.

### 4b — Datenexport (Finding C-3, Feature-Teil)

- [ ] **4.4** Query, die alle Datensätze zu einem Meeple über die ~15 Tabellen sammelt. Fachlich gehört das in [`src/lib/members/`](../../src/lib/members/) — es ist eine Domänenabfrage, keine Komponentenlogik. Auf die 400-Zeilen-Grenze achten; Vorbild für den Schnitt ist `holdings.ts` / `holdings-lookup.ts`.
- [ ] **4.5** Server Action + UI im Profilbereich. Bestehende Bausteine nutzen statt neu bauen: `useAction()`, `<ActionButton>` — siehe Tabelle in [`CLAUDE.md`](../../CLAUDE.md).
- [ ] **4.6** Test, der gegen das Schema prüft, dass **jede** Tabelle mit Meeple-Bezug im Export vorkommt. Ohne diesen Test ist der Export beim nächsten neuen Modell still unvollständig — das ist der wahrscheinlichste Weg, wie diese Funktion später wieder falsch wird.
- [ ] **4.7** Zusage in [`legal.ts`](../../src/data/legal.ts) wieder auf den nun existierenden Profil-Export umstellen (nimmt Schritt 1.1 bewusst zurück).
- [ ] **Commit:** `feat(profil): add self-service data export for GDPR access requests`

### 4c — Anonymisierung vervollständigen (Finding M-4)

`anonymiseMeeple()` in [`admin-mitglieder/actions.ts:59-116`](../../src/components/feature/admin-mitglieder/actions.ts#L59-L116) erweitern — die Funktion ist gut gebaut (Transaktion, Neon-Auth-Zeilen, Blocken bei offenen Vereinsspielen), es fehlen nur Felder.

- [ ] **4.8** Freitextfelder gemäß 4.2 behandeln: `LfgPost.title`/`.description`, `MarketListing.title`/`.description`, `SparePartListing.description`, `GameHolding.note`, `StorageUnitMove.locationNote`, `StorageUnit.locationNote`, `Post.author`.
- [ ] **4.9** `MarketListing.imageUrls` aus Vercel Blob löschen. **Der wichtigste Teilschritt dieses Abschnitts:** Blob-URLs sind ohne Auth erreichbar, Fotos können identifizierend sein, und heute bleiben sie nach der Anonymisierung unbegrenzt liegen.
- [ ] **4.10** Test erweitern in [`admin-mitglieder/actions.test.ts`](../../src/components/feature/admin-mitglieder/actions.test.ts): nach Anonymisierung kein Feld mit Personenbezug, keine Blob-Datei mehr.
- [ ] **Commit:** `fix(members): clear free-text fields and blob images on anonymisation`

### 4d — Löschweg und Fristen (Finding M-5)

- [ ] **4.11** Löschantrag im Profil: Mitglied stellt Antrag, Admin sieht ihn mit Fristanzeige. Heute ist ein Art.-17-Verlangen eine manuelle Admin-Handlung ohne Antrag, Warteschlange oder Nachverfolgung — ob die Monatsfrist des Art. 12 Abs. 3 gehalten wurde, ist im System nicht ablesbar.
- [ ] **4.12** Automatische Anonymisierung nach der in 4.1 festgelegten Frist. **Muster existiert bereits:** `deleteExpiredBankDataAccessLogs()` in [`bank-access-log.ts:31`](../../src/lib/members/bank-access-log.ts#L31), aufgehängt am täglichen Cron [`/api/cron/instagram-queue`](../../src/app/api/cron/instagram-queue/route.ts) (`0 5 * * *` in [`vercel.json`](../../vercel.json)). Denselben Weg nehmen, keinen zweiten Cron bauen.
- [ ] **4.13** Die bestehende Vorbedingung respektieren: keine automatische Anonymisierung, solange Vereinsspiele oder -einheiten beim Mitglied liegen. Die Prüfung steht schon in `actions.ts:73-84` und ist wiederzuverwenden, nicht nachzubauen.
- [ ] **Commit:** `feat(members): add deletion requests and automatic retention-based anonymisation`

### 4e — Bank-CSV (Finding M-6)

- [ ] **4.14** Bestätigungsdialog vor `exportBankDataCsv()` mit Klartext-Hinweis: Anzahl enthaltener unverschlüsselter IBANs, Pflicht zum Löschen nach Verwendung. `<ActionDialog>` verwenden, kein eigenes Dialog-Skelett.
- [ ] **4.15** Prüfen, ob der Export auf tatsächlich einzuziehende Mitglieder eingeschränkt werden kann (Datenminimierung). Aktuell filtert [`actions.ts:54`](../../src/components/feature/admin-bank/actions.ts#L54) nur auf `ibanEncrypted != null` und `anonymizedAt: null` — fachlich zu klären, ob „gekündigt, aber noch beitragspflichtig" dazugehört.
- [ ] **Commit:** `feat(admin-bank): warn about CSV contents before exporting plaintext IBANs`

---

## Nicht in diesem Plan

- **Finding L-2** — `InstagramConnection.accessToken` liegt im Klartext, während IBANs AES-256-GCM-verschlüsselt sind. Kein personenbezogenes Datum, daher außerhalb dieses Audits. Der Baustein `encryptSecret` existiert und wäre direkt anwendbar; Bewertung gehört in `/security-audit`.
- **#4 Consent-Banner** — laut Audit nicht erforderlich. Nur der Datenschutz-Abschnitt daraus ist hier eingearbeitet (Schritt 1.8). Empfehlung im Kommentar zu #4: Issue auf diesen Abschnitt reduzieren.
- **AV-Verträge nach Art. 28** — Vereinsarbeit. Der Code kann Neon, Vercel und Meta nur benennen.
- **Juristische Endabnahme der Rechtstexte** — Phase 1 schafft eine korrekte Grundlage, ersetzt keine anwaltliche Prüfung.

## Prüfung nach jeder Phase

- `pnpm run verify` (typecheck + lint + test) — auch in den Textphasen, `legal.ts` ist typisiert
- `pnpm run dup` bei Phase 4, Zielzustand 0 Klone
- Phase 1 und 3 verändern öffentliche Seiten: `/rechtliches/impressum`, `/rechtliches/datenschutz` und die neue Attributionsseite im laufenden Dev-Server ansehen, nicht nur die Tests glauben

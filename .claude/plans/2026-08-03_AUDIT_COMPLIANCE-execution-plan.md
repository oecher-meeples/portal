# Ausführungsplan: Compliance-Audit 2026-08-03 umsetzen

- **Erstellt/Aktualisiert:** 2026-08-03 13:59
- **Ziel:** Die veröffentlichten Rechtstexte sagen die Wahrheit, die Lizenzlage ist entschieden und belegbar, und Betroffenenrechte sind nicht mehr Handarbeit.
- **Quelle:** [`.claude/audits/2026-08-03_AUDIT_COMPLIANCE.md`](../audits/2026-08-03_AUDIT_COMPLIANCE.md)
- **Issues:** #48, #50, #41, #49 — alle Kinder von #21
- **Git-Base-State:** Branch `develop`, HEAD `649681a`, Working Tree clean

> Details, Belege und Fundstellen stehen in der Quelldatei — hier nicht duplizieren. Jeder Schritt nennt sein Finding-Kürzel (C-1, H-2, …) zum Nachschlagen.

## Persona

Du bist Full-Stack-Entwickler:in für ein Next.js-16-Portal mit App Router, Server Actions, Prisma/PostgreSQL und Tailwind v4, und arbeitest an einem Vereinsportal mit echten Mitglieder- und Bankdaten. Du kennst DSGVO-Pflichten gut genug, um Rechtstexte an Code abzugleichen, und Open-Source-Lizenzen gut genug, um AGPL von MPL zu unterscheiden. Du hältst dich strikt an die Schichtenregeln in [`CLAUDE.md`](../../CLAUDE.md) und weichst eine Lint-Regel nie auf, um einen Import durchzubekommen.

## Getroffene Annahmen

- **Scope:** alle vier Issues (#48, #50, #41, #49).
- **Impressum (H-3):** Echte Vereinsdaten liegen **nicht** vor. Der Plan strukturiert das Impressum, setzt die Werte als klar markierte TODO-Platzhalter und meldet den Schritt als offen. **Es wird kein plausibel klingendes Impressum erfunden** — ein falsches ist schlechter als ein erkennbar unfertiges.
- **AGPL-Folge (C-1/C-2):** Zeigt der Bundle-Check, dass AGPL-Code im Artefakt landet, wird das **nur dokumentiert** (ADR + Kommentar in #41). Der Austausch von `@neondatabase/auth` gegen `better-auth` ist ein Refactor am Login-Pfad und für einen autonomen Lauf zu riskant.
- **`next build`:** wird als eigener Schritt **nur vor dem Bundle-Check** ausgeführt (Schritt 11), nicht als Definition of Done jedes Schritts. Für die übrigen Schritte genügt `pnpm run verify`.
- **Aufbewahrungsfrist nach Austritt (M-5):** ist eine Vorstandsentscheidung mit echtem Konflikt zwischen Datenminimierung und steuerlicher Belegaufbewahrung. Der Plan baut die **Mechanik** parametrisiert, aktiviert sie aber nicht mit einer geratenen Frist (Schritt 20).
- **Freitextfelder (M-4):** aufgeteilt. Eindeutige Fälle werden umgesetzt (`Post.author` ist ein Namensfeld; `MarketListing.imageUrls` sind die eigenen Fotos des Mitglieds, deren Löschung das Profil-UI zusagt). Die beschreibenden Freitexte (`LfgPost.description` etc.) bleiben eine offene Entscheidung, weil Löschen Vereinshistorie zerstört, die andere Mitglieder betrifft (Schritt 18).
- **Finding L-2** (`InstagramConnection.accessToken` im Klartext) ist **nicht** Teil dieses Plans — kein personenbezogenes Datum, gehört in `/security-audit`.
- **#4** (Consent-Banner) wird nicht gebaut; laut Audit nicht erforderlich. Nur der Cookie-Abschnitt der Datenschutzerklärung ist enthalten (Schritt 5).
- **AV-Verträge nach Art. 28** sind Vereinsarbeit. Der Code kann Neon, Vercel und Meta nur benennen.

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch. Die Rechtstexte in `src/data/legal.ts` sind Benutzerausgaben — also Deutsch, in der im Repo etablierten Anführungszeichen-Form („…").
- Halte dich an Best-Practices und das DRY-Prinzip (keine Logik/Markup/Styling doppelt). Vor dem Neuschreiben eines Bausteins die Tabelle „Vor dem Wiedererfinden" in [`CLAUDE.md`](../../CLAUDE.md) prüfen — `useAction()`, `<ActionButton>`, `<ActionDialog>`, `<TextField>` existieren bereits.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Dateien über 400 Zeilen möglichst in kleinere Dateien aufteilen (ESLint `max-lines` bricht sonst den Build). Entlang der Fachlichkeit teilen, nicht mechanisch abschneiden.
- Die Schichtenregeln aus [`CLAUDE.md`](../../CLAUDE.md) sind hart erzwungen (`import/no-restricted-paths`). `src/lib/**` importiert nie aus `src/components/**`.
- **Unit-Tests:** Für neue Logik/Funktionen Unit-Tests schreiben. Die Definition of Done gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische Schritte (Config, Doku, Boilerplate).
- **Committe nur Dateien, die du selbst geschrieben hast** — gezieltes `git add <datei>`, niemals `git add .`. Im Working Tree liegt bereits eine unversionierte Fremddatei (`.claude/plans/2026-08-03_AUDIT_PROCESS-execution-plan.md`), die nicht zu diesem Plan gehört.
- **Blockierende Prozesse:** Du darfst Prozesse beenden, die eine für einen Schritt benötigte Ressource blockieren (Port 3002 beim Dev-Server, Datei-Locks). Gezielt den blockierenden Prozess beenden, nicht den Schritt abbrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert < 1 h).
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done zumindest teilweise erfüllt ist. Falls ja, Teilstand mit Präfix `wip:` committen; falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler als Stichpunkt unter dem Schritt notieren und **mit dem nächsten Schritt fortfahren — nicht abbrechen**. Erst nachdem alle Schritte durchlaufen sind, alle offenen Punkte gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist.
- **Erfinde keine Rechtsinhalte.** Wo eine Angabe fehlt (Vereinsanschrift, Aufbewahrungsfrist), wird ein sichtbares `TODO` gesetzt und der Schritt als `[!]` gemeldet — niemals eine plausible Angabe eingesetzt.

## Schritte

### Vorbereitung

- [ ] **0. Repository prüfen**
      Git-Repo ist vorhanden (Branch `develop`, HEAD `649681a`), `.gitignore` existiert. Nur verifizieren, nicht neu anlegen. `git status` muss den Working Tree clean zeigen, bis auf die genannte Fremddatei unter `.claude/plans/`.
      _Definition of Done:_ `git status` läuft, Working Tree enthält keine unerwarteten Änderungen.
      _Kein Commit — reiner Prüfschritt._

- [ ] **1. Testframework prüfen**
      Vitest ist eingerichtet ([`vitest.config.ts`](../../vitest.config.ts), `pnpm run test`), inklusive Testing Library und `jsdom`. Nichts installieren. Einmal `pnpm run verify` (typecheck + lint + test) als Baseline laufen lassen.
      _Definition of Done:_ `pnpm run verify` ist grün. Ist es das nicht, diesen Schritt als `[!]` melden und den Fehler notieren — alle folgenden Schritte laufen dann auf einer roten Baseline und das muss sichtbar sein.
      _Kein Commit — reiner Prüfschritt._

### #48 — Rechtstexte an die tatsächliche Verarbeitung angleichen

Alles in [`src/data/legal.ts`](../../src/data/legal.ts) — ein statisches `Record<string, LegalSection[]>`, ausgeliefert über `/rechtliches/[slug]` per `generateStaticParams()`. Kein Schema, keine neue Komponente.

- [ ] **2. Unwahre Export-Zusage entfernen** (Finding C-3, Textteil)
      In `legal.ts:52` verspricht der Abschnitt „3. Betroffenenrechte" einen Export über den Profilbereich. Diese Funktion existiert nicht (verifiziert: `src/components/feature/profil/` enthält keine Export-Action). Aussage durch den real existierenden Weg ersetzen: Auskunft auf Anfrage, Kontakt über die Angaben im Impressum. **Zuerst dieser Schritt**, weil er allein die Falschaussage beseitigt und Minuten dauert. Schritt 16 nimmt ihn bewusst zurück, sobald der Export existiert.
      _Definition of Done:_ Der String „Export über den eigenen Profilbereich" kommt in `src/data/legal.ts` nicht mehr vor; `pnpm run verify` grün.
      `git commit -m "docs: remove privacy policy claim about a non-existent data export"`

- [ ] **3. Verarbeitete Daten, Rechtsgrundlagen und Speicherdauern ergänzen** (Finding H-2, Teil 1)
      Abschnitt „2. Verarbeitete Daten" nennt heute nur Name, E-Mail und Bankverbindung. Ersetzen anhand der Datenarten-Tabelle in der Quelldatei (Abschnitt 2), abgeleitet aus [`prisma/schema.prisma`](../../prisma/schema.prisma). Ausdrücklich mit aufnehmen: Messenger-Handles und Plattformkennungen, Mitgliedsnummer, Ein-/Austrittsdaten — und die **Verhaltensdaten** (Verleihhistorie, Schichtbuchungen, Erklärbär-Anwesenheit, Mitspielsuche, Flohmarkt/Markt inkl. Bilder, private Spielesammlung). Dass ein dichtes Verhaltensprofil entsteht, ist der eigentlich nicht offengelegte Punkt, nicht die Feldliste.
      Zwei neue Abschnitte anfügen: **Rechtsgrundlagen** (Art. 6 — Mitgliedsverwaltung und Beitragseinzug über den Mitgliedsvertrag, die freiwilligen Messenger-Handles über Einwilligung) und **Speicherdauern** (24 Monate für `BankDataAccessLog`, Quelle `BANK_LOG_RETENTION_MONTHS` in [`bank-access-log.ts:5`](../../src/lib/members/bank-access-log.ts#L5)). Die Frist für Stammdaten nach Austritt bleibt hier **offen** — als sichtbares `TODO` markieren, Schritt 20 trägt sie nach.
      _Definition of Done:_ Die Abschnitte existieren, jede genannte Datenart ist im Schema belegbar, keine Datenart aus der Audit-Tabelle fehlt; `pnpm run verify` grün.
      `git commit -m "docs: list all processed data categories and legal bases in privacy policy"`

- [ ] **4. Betroffenenrechte, Auftragsverarbeiter und Cookies ergänzen** (Finding H-2, Teil 2 + L-3)
      Abschnitt „3. Betroffenenrechte" auf den vollen Umfang bringen: Art. 15, 16, 17, 18, 20, 21, Widerruf nach Art. 7 Abs. 3, Beschwerderecht bei der Aufsichtsbehörde nach Art. 13 Abs. 2 lit. d.
      Neuer Abschnitt **Auftragsverarbeiter**: Neon (Datenbank + Auth), Vercel (Hosting + Blob-Speicher), Meta (Instagram-Cross-Posting). Belege in `.env.example` und [`graph-client.ts:1`](../../src/lib/instagram/graph-client.ts#L1). Hinweis auf AV-Verträge nach Art. 28 aufnehmen, ohne deren Bestand zu behaupten.
      Neuer Abschnitt **Cookies**: ausschließlich technisch notwendige Session-Cookies von Neon Auth, kein Tracking, kein Analytics. Das ist verifiziert (null Treffer für Analytics-SDKs in `package.json` und `src/`). **Keinen Consent-Banner bauen** — siehe Kommentar zu #4.
      _Definition of Done:_ Alle drei Abschnitte existieren; keine Aussage über Cookies oder Empfänger widerspricht dem Code; `pnpm run verify` grün.
      `git commit -m "docs: add data subject rights, processors and cookie section to privacy policy"`

- [ ] **5. Impressum strukturieren, Werte als TODO markieren** (Finding H-3)
      `legal.ts:56-71` enthält „Musterstraße 1, 52062 Aachen" und „Platzhalter – finale Angaben folgen." Die **Struktur** nach § 5 DDG herstellen: Vereinsname, ladungsfähige Anschrift, Vertretungsberechtigte, Kontakt, Registergericht + Registernummer. Jeden fehlenden Wert als unmissverständliches `TODO` kennzeichnen, das im gerenderten Text als offen erkennbar ist — **keine erfundene Adresse, kein erfundener Registereintrag**.
      Zusätzlich prüfen: `legal.ts:13` führt den Verein als „e. V.". Ist die Eintragung nicht belegt, im Impressum als Vorgründungsstatus formulieren statt einen Registereintrag zu behaupten.
      **Diesen Schritt am Ende als `[!]` melden**, mit dem Hinweis, welche Angaben der Verein liefern muss — er ist konstruktionsbedingt unvollständig.
      _Definition of Done:_ Die Impressum-Struktur ist vollständig, jeder fehlende Wert ist als `TODO` markiert, der String „Musterstraße" kommt nicht mehr vor; `pnpm run verify` grün. Schritt gilt als `[!]`, nicht als `[x]`.
      `git commit -m "docs: structure Impressum per § 5 DDG with explicit TODOs for missing data"`

### #50 — OSS-Attribution und Dependency-Deklaration

- [ ] **6. Runtime-Dependencies korrekt deklarieren** (Finding L-1)
      In [`package.json`](../../package.json) `@prisma/client` (Zeile 47) und `better-auth` (Zeile 57) aus `devDependencies` nach `dependencies` verschieben. Beide werden zur Laufzeit gebraucht — `@prisma/client` in jedem Query-Modul, `better-auth` als Kern von `@neondatabase/auth`. **Zuerst in dieser Gruppe**, weil sonst jede `--prod`-Auswertung strukturell falsch bleibt und Schritt 7 auf falschen Daten arbeitet.
      Danach `pnpm install`, dann `pnpm licenses list --prod` — `vitest`, `tsx` und `prettier` dürfen in der Ausgabe nicht mehr auftauchen. Tun sie es doch, ist eine weitere Runtime-Dependency falsch deklariert: suchen und ebenfalls verschieben, nicht ignorieren.
      _Definition of Done:_ Beide Pakete stehen unter `dependencies`, `pnpm licenses list --prod` enthält keine reinen Testwerkzeuge mehr, `pnpm run verify` grün.
      `git commit -m "chore: declare @prisma/client and better-auth as runtime dependencies"`

- [ ] **7. Lizenz-Prüfung wiederholbar machen** (Finding L-1, Methodik)
      Script `licenses` in `package.json` ergänzen (`pnpm licenses list --prod`). In [`CLAUDE.md`](../../CLAUDE.md) einen kurzen Punkt aufnehmen, **dass `license-checker` bei pnpm unbrauchbar ist**: es erfasst nur 21 von 734 Paketen und findet keinen der kritischen Funde. Ohne diese Notiz wiederholt der nächste Audit-Durchlauf denselben Fehler.
      _Definition of Done:_ `pnpm run licenses` läuft und listet den Production-Baum; die Notiz steht in `CLAUDE.md`.
      `git commit -m "chore: add licenses script and document license-checker pitfall"`

- [ ] **8. `THIRD-PARTY-LICENSES.md` generieren** (Findings M-1, M-3)
      Datei im Repo-Root erzeugen: Paket → Version → Lizenz → Lizenztext oder Link. Grundlage `pnpm licenses list --prod --json` (Stand Audit: 734 Pakete). Die Attributionspflicht greift hier tatsächlich, weil das Repository **public** ist und die eigene `LICENSE` Dritten Ansicht einräumt.
      Die prüfpflichtigen Pakete ausdrücklich in einem eigenen Abschnitt aufführen, nicht in der MIT-Masse verstecken: 5 × MPL-2.0 (`@vercel/og`, `satori`, `@resvg/resvg-wasm`, `lightningcss` ×2) und `@img/sharp-*` (Apache-2.0 AND LGPL-3.0-or-later). Beide Gruppen sind laut Audit inhaltlich unproblematisch — unveränderte Bibliotheksnutzung bzw. dynamisch geladenes, unmodifiziertes Binary — es fehlt nur die Nennung. `caniuse-lite` (CC-BY-4.0) mit Urhebernennung aufführen, weil CC-BY sie ausdrücklich verlangt.
      Generierung als `package.json`-Script festhalten, damit die Datei bei Dependency-Änderungen nicht driftet.
      _Definition of Done:_ `THIRD-PARTY-LICENSES.md` existiert, enthält alle Production-Pakete, hat einen eigenen Abschnitt für MPL/LGPL/CC-BY, und ein dokumentiertes Script erzeugt sie reproduzierbar.
      `git commit -m "docs: add third-party license attribution for production dependencies"`

- [ ] **9. Attribution im Portal verlinken** (Finding M-3)
      Neue Sektion unter `/rechtliches` anlegen. Muster ist `LEGAL_DOCS` in [`src/data/downloads.ts`](../../src/data/downloads.ts) zusammen mit `LEGAL_CONTENT` in `legal.ts` — die Route [`src/app/rechtliches/[slug]/page.tsx`](../../src/app/rechtliches/) rendert beides über `generateStaticParams()`, ein neuer Slug braucht also Einträge in **beiden** Strukturen. Alternativ als Abschnitt im Impressum verlinken, falls die Liste zu lang für eine Sektion ist. Damit ist „Verwendete Bibliotheken referenzieren" aus #21 abgedeckt.
      _Definition of Done:_ Die Attribution ist im laufenden Dev-Server (`pnpm dev`, Port 3002) unter `/rechtliches` erreichbar; `pnpm run verify` grün.
      `git commit -m "feat(rechtliches): link third-party license attribution"`

### #41 — AGPL-Kette klären (nur Analyse und Dokumentation)

- [ ] **10. Projekt neu bauen** (Voraussetzung für Schritt 11)
      `pnpm build` ausführen. Dieser Schritt existiert eigenständig, weil der Bundle-Check in Schritt 11 ein frisches Artefakt braucht **und** weil die Schritte 6–9 `package.json` und die Routen angefasst haben — ein grüner `verify` beweist noch keinen funktionierenden Production-Build.
      Läuft der Build nicht, ist das **kein Nebenfix**: Ursache notieren, Schritt als `[!]` melden, Schritt 11 überspringen und mit Schritt 12 fortfahren. Ein defekter Build ist ein eigenes Issue (siehe [`2026-08-03_AUDIT_PROCESS-execution-plan.md`](2026-08-03_AUDIT_PROCESS-execution-plan.md), dort ist `next build` in der CI Thema).
      _Definition of Done:_ `pnpm build` endet mit Exit-Code 0 und `.next/` enthält ein vollständiges Artefakt.
      _Kein Commit — reiner Prüfschritt. Sicherstellen, dass `.next/` in `.gitignore` steht._

- [ ] **11. Bundle auf AGPL-Code prüfen** (Findings C-1, C-2)
      Im Artefakt unter `.next/` nach Code aus `@triplit`, `ua-parser-js`, `@daveyplate` und `@neondatabase/auth-ui` suchen — Server- **und** Client-Bundles getrennt auswerten. Erwartung aus dem Audit: nicht enthalten, weil `src/` sie nirgends importiert (nur [`auth/server.ts:1`](../../src/lib/auth/server.ts#L1) und [`auth/client.ts:3`](../../src/lib/auth/client.ts#L3) greifen auf `@neondatabase/auth` zu). Erwartung ist kein Beleg — deshalb dieser Schritt.
      Das Ergebnis pro Paket festhalten, mit dem verwendeten Suchbefehl, damit es nachvollziehbar bleibt.
      _Definition of Done:_ Für jedes der vier Pakete liegt ein belegtes Ja/Nein vor, inklusive des Befehls, mit dem es festgestellt wurde.
      _Kein Commit — Ergebnis geht in Schritt 12 ein._

- [ ] **12. Lizenzbefund als ADR festhalten und in #41 kommentieren** (Findings C-1, C-2, H-1)
      Lizenz von `@triplit/db`, `@triplit/logger` und `@triplit/react` am Upstream-Repository klären — **nicht** am npm-Manifest, dort fehlt das `license`-Feld. Ohne ausdrückliche Lizenz besteht per Urheberrecht kein Nutzungsrecht; das ist der ungünstigste Ausgangspunkt, nicht der harmloseste.
      ADR unter [`docs/adr/`](../../docs/adr/) anlegen (Nummerierung der vorhandenen Dateien fortsetzen, Format übernehmen). Inhalt: der Auflösungspfad `@neondatabase/auth` → `@neondatabase/auth-ui` → `@daveyplate/better-auth-ui` → `@triplit/client`, das Ergebnis aus Schritt 11, die Triplit-Lizenzlage, und die Bewertung.
      Die Bewertung **muss ausdrücklich auf AGPL §13 eingehen**: die Netzwerk-Klausel greift beim Betrieb, nicht erst beim Ausliefern — „ist nicht gebundelt" trägt allein also nicht. Ebenso festhalten, dass `ua-parser-js` seit 2.0 bewusst dual-licensed ist (AGPL oder kommerzielle Lizenz), der Autor also ein Durchsetzungsinteresse hat.
      Zusätzlich den Widerspruch dokumentieren: Repository ist **public**, [`LICENSE`](../../LICENSE) sagt „All rights reserved" und räumt nur akademische Ansicht ein.
      Danach das Ergebnis als Kommentar an #41 schreiben (`gh issue comment 41`). **Keinen Dependency-Austausch vornehmen** — das ist ein Auth-Refactor und laut Annahmen ausgeschlossen.
      _Definition of Done:_ ADR existiert unter `docs/adr/`, geht auf §13 ein, nennt das Bundle-Ergebnis; Kommentar an #41 ist gesetzt.
      `git commit -m "docs(adr): record AGPL dependency assessment for @neondatabase/auth subtree"`

### #49 — Betroffenenrechte umsetzen

- [ ] **13. Query für den Datenexport** (Finding C-3, Feature-Teil)
      Funktion in [`src/lib/members/`](../../src/lib/members/) anlegen, die alle Datensätze zu einem Meeple über die betroffenen Tabellen sammelt (siehe Datenarten-Tabelle der Quelldatei). Das ist eine Domänenabfrage und gehört in den Lib-Layer, nicht in eine Komponente. Auf die 400-Zeilen-Grenze achten; Vorbild für den Schnitt ist `holdings.ts` / `holdings-lookup.ts`.
      Zur IBAN: nur `ibanLast4` ausgeben, nicht die entschlüsselte IBAN. Eine unverschlüsselte Exportdatei mit vollständiger IBAN wäre ein neues Problem statt eines gelösten; im Export auf den Weg über den Kassenwart hinweisen.
      _Definition of Done:_ Funktion existiert, Unit-Test deckt einen Meeple mit Daten in mehreren Tabellen ab und ist grün; `pnpm run verify` grün.
      `git commit -m "feat(members): add query collecting all personal data for a meeple"`

- [ ] **14. Vollständigkeitstest gegen das Schema**
      Test schreiben, der prüft, dass **jedes** Prisma-Modell mit Meeple-Bezug im Export vorkommt. Ohne diesen Test ist der Export beim nächsten neuen Modell still unvollständig — das ist der wahrscheinlichste Weg, wie diese Funktion später wieder falsch wird, und der Grund, warum er einen eigenen Schritt bekommt.
      Der Test muss fehlschlagen, wenn ein Modell mit `meepleId`-Relation hinzukommt, ohne im Export berücksichtigt zu sein.
      _Definition of Done:_ Test ist grün; wird er testweise durch Entfernen einer Tabelle aus dem Export sabotiert, schlägt er fehl (kurz verifizieren, dann zurücknehmen).
      `git commit -m "test(members): assert data export covers every meeple-related model"`

- [ ] **15. Export-UI im Profilbereich**
      Server Action plus UI-Einstiegspunkt in [`src/components/feature/profil/`](../../src/components/feature/profil/). Bestehende Bausteine verwenden: `useAction()` und `<ActionButton>` — **kein** eigener `isSubmitting`/`setError`-State. Server Actions an Client-Komponenten aus einer Server-Komponente heraus per `.bind(null, id)` übergeben, eine normale Closure ist nicht serialisierbar.
      Format JSON (Art. 20 verlangt „strukturiert, gängig, maschinenlesbar").
      _Definition of Done:_ Ein eingeloggtes Mitglied kann im Profil den Export auslösen und erhält eine JSON-Datei mit seinen Daten; Test für die Action grün; im Dev-Server geprüft.
      `git commit -m "feat(profil): add self-service data export for GDPR access requests"`

- [ ] **16. Export-Zusage in der Datenschutzerklärung wieder aktivieren**
      Schritt 2 hat die Zusage entfernt, weil die Funktion fehlte. Jetzt existiert sie: `legal.ts` auf den Profil-Export umstellen und den konkreten Weg beschreiben. Auch den Hinweis auf die IBAN-Behandlung aufnehmen, damit der Text zum Verhalten aus Schritt 13 passt.
      _Definition of Done:_ Der Text beschreibt den tatsächlich existierenden Export inklusive IBAN-Einschränkung; `pnpm run verify` grün.
      `git commit -m "docs: restore privacy policy export claim now that the export exists"`

- [ ] **17. Anonymisierung: Namensfeld und Blob-Bilder** (Finding M-4, eindeutiger Teil)
      `anonymiseMeeple()` in [`admin-mitglieder/actions.ts:59-116`](../../src/components/feature/admin-mitglieder/actions.ts) erweitern. Die Funktion ist gut gebaut — Transaktion, Löschen der Neon-Auth-Zeilen, Blockieren bei offenen Vereinsspielen —, es fehlen nur Felder.
      Zwei eindeutige Fälle umsetzen: `Post.author` ist ein Freitext-Namensfeld und gehört geleert. Und `MarketListing.imageUrls`: **der wichtigste Teilschritt dieses Abschnitts.** Die Fotos liegen in Vercel Blob, Blob-URLs sind ohne Auth erreichbar, Fotos können identifizierend sein — und heute bleiben sie nach der Anonymisierung unbegrenzt liegen, obwohl das Profil-UI die Löschung der Daten zusagt. Die Blobs also tatsächlich löschen, nicht nur die URL-Referenz.
      _Definition of Done:_ Test in [`admin-mitglieder/actions.test.ts`](../../src/components/feature/admin-mitglieder/actions.test.ts) belegt, dass nach der Anonymisierung `Post.author` leer ist und die Blob-Löschung aufgerufen wurde; `pnpm run verify` grün.
      `git commit -m "fix(members): delete blob images and author name on anonymisation"`

- [ ] **18. Freitextfelder: Entscheidung vorbereiten, nicht treffen** (Finding M-4, offener Teil)
      Betroffen sind `LfgPost.title`/`.description`, `MarketListing.title`/`.description`, `SparePartListing.description`, `GameHolding.note`, `StorageUnitMove.locationNote`, `StorageUnit.locationNote`. Sie können Namen enthalten, aber Löschen zerstört Vereinshistorie, die andere Mitglieder betrifft.
      **Nicht autonom entscheiden.** Stattdessen: den Konflikt als Kommentar an #49 schreiben (`gh issue comment 49`), mit der Feldliste und den beiden Optionen — Felder räumen, oder die Zusage „namenlos lesbar" in [`profil-view.tsx:117-119`](../../src/components/feature/profil/profil-view.tsx#L117-L119) relativieren. Eines von beidem muss weichen; welches, ist eine Vereinsentscheidung.
      **Schritt am Ende als `[!]` melden.**
      _Definition of Done:_ Kommentar an #49 mit Feldliste und beiden Optionen ist gesetzt. Kein Code geändert. Schritt gilt als `[!]`.
      _Kein Commit._

- [ ] **19. Löschantrag im Profilbereich** (Finding M-5, Teil 1)
      Heute ist ein Art.-17-Verlangen eine manuelle Admin-Handlung ohne Antrag, Warteschlange oder Nachverfolgung — ob die Monatsfrist des Art. 12 Abs. 3 gehalten wurde, ist im System nicht ablesbar. Mitglied stellt im Profil einen Antrag; Admin sieht ihn in der Mitgliederverwaltung mit Fristanzeige.
      Die bestehende Vorbedingung wiederverwenden, nicht nachbauen: die Prüfung auf offene Vereinsspiele und -einheiten steht schon in `actions.ts:73-84`.
      Schema-Änderung nötig → Prisma-Migration anlegen. `pnpm run dup` prüfen, Zielzustand 0 Klone.
      _Definition of Done:_ Migration läuft, Mitglied kann Antrag stellen, Admin sieht ihn mit Frist; Tests für Action und Fristberechnung grün; `pnpm run verify` grün.
      `git commit -m "feat(members): add deletion requests with statutory deadline tracking"`

- [ ] **20. Automatische Anonymisierung nach Aufbewahrungsfrist** (Finding M-5, Teil 2)
      Heute anonymisiert nichts von selbst: ein vor Jahren ausgetretenes Mitglied bleibt mit Klarnamen, E-Mail, Handles und verschlüsselter IBAN gespeichert, bis jemand daran denkt.
      **Muster existiert bereits** — `deleteExpiredBankDataAccessLogs()` in [`bank-access-log.ts:31`](../../src/lib/members/bank-access-log.ts#L31), aufgehängt am täglichen Cron [`/api/cron/instagram-queue`](../../src/app/api/cron/instagram-queue/route.ts) (`0 5 * * *` in [`vercel.json`](../../vercel.json)). Denselben Weg nehmen, **keinen zweiten Cron** anlegen.
      Die Frist selbst ist eine Vorstandsentscheidung mit echtem Konflikt: Datenminimierung nach Art. 5 Abs. 1 lit. c drängt auf Löschen, steuerliche Belegaufbewahrung kann für Beitragsdaten Jahre verlangen — getrennte Fristen für Stammdaten und Finanzdaten sind wahrscheinlich die richtige Antwort. **Die Frist nicht raten.** Mechanik als benannte Konstante nach dem Muster von `BANK_LOG_RETENTION_MONTHS` bauen, den Wert unbelegt lassen und die automatische Ausführung deaktiviert halten, bis er entschieden ist. Die offene Frage als Kommentar an #49 schreiben und in `legal.ts` (Schritt 3) das dortige `TODO` zur Frist stehen lassen.
      **Schritt am Ende als `[!]` melden** — die Mechanik ist fertig, die Aktivierung nicht.
      _Definition of Done:_ Funktion existiert mit Unit-Test (mit einer Testfrist geprüft), ist im bestehenden Cron verdrahtet aber deaktiviert, respektiert die Vorbedingung offener Vereinsspiele; Kommentar an #49 gesetzt; `pnpm run verify` grün. Schritt gilt als `[!]`.
      `git commit -m "feat(members): add retention-based anonymisation, inactive pending period decision"`

- [ ] **21. Warnung vor dem Bank-CSV-Export** (Finding M-6)
      `exportBankDataCsv()` in [`admin-bank/actions.ts:50-84`](../../src/components/feature/admin-bank/actions.ts) entschlüsselt die IBANs aller Mitglieder in eine unverschlüsselte CSV. Zugriffsschutz und Protokollierung sind korrekt gebaut und bleiben unangetastet — die Lücke ist die Übergabe: sobald die Datei auf dem Rechner liegt, endet jede technische Kontrolle, und die UI sagt nirgends, was drinsteht.
      Bestätigungsdialog mit `<ActionDialog>` ergänzen (**kein** eigenes Dialog-Skelett), der die Anzahl enthaltener unverschlüsselter IBANs und die Löschpflicht nach Verwendung nennt. Export startet erst nach Bestätigung.
      Zusätzlich prüfen und in #49 kommentieren, ob der Export auf tatsächlich einzuziehende Mitglieder eingeschränkt werden kann (Datenminimierung). `actions.ts:54` filtert heute nur auf `ibanEncrypted != null` und `anonymizedAt: null` — ob „gekündigt, aber noch beitragspflichtig" dazugehört, ist fachlich zu klären.
      _Definition of Done:_ Dialog erscheint vor dem Export, nennt die Anzahl der IBANs und die Löschpflicht; Test grün; im Dev-Server geprüft; `pnpm run verify` grün.
      `git commit -m "feat(admin-bank): confirm CSV export and warn about plaintext IBAN contents"`

### Abschluss

- [ ] **22. Gesamtprüfung**
      `pnpm run verify`, `pnpm run dup` (Zielzustand 0 Klone) und `pnpm build` laufen lassen. Die veränderten öffentlichen Seiten im Dev-Server (`pnpm dev`, Port 3002) ansehen, nicht nur den Tests glauben: `/rechtliches/impressum`, `/rechtliches/datenschutz`, die neue Attributionsseite und der Profilbereich.
      Ändert sich durch diesen Plan die Struktur (neuer geteilter Baustein, neue Schicht), [`docs/project-structure.md`](../../docs/project-structure.md) mit anpassen — sonst driftet die Doku.
      _Definition of Done:_ Alle drei Befehle grün, alle vier Seiten manuell gesichtet.
      `git commit -m "docs: update project structure after compliance work"` _(nur falls Doku-Änderungen anfielen; sonst kein Commit)_

- [ ] **23. Offene Punkte sammeln und besprechen**
      Alle mit `[!]` markierten Schritte auf Deutsch zusammenfassen und dem Nutzer vorlegen. Erwartbar offen: Schritt 5 (Vereinsdaten fürs Impressum), Schritt 18 (Freitextfelder), Schritt 20 (Aufbewahrungsfrist) — plus alles, was unterwegs fehlgeschlagen ist. Je Punkt nennen, was fehlt und wer es entscheiden muss.
      _Definition of Done:_ Sammelübersicht ist ausgegeben.
      _Kein Commit._

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5) für die Schritte 2–12 und 17–21; `claude-opus-5` (Opus 5) für die Schritte 13–16.
- **Reasoning/Thinking:** an, **hoher** Effort — gekoppelt an den schwierigsten Schritt, nicht an den Durchschnitt.
- **Begründung:** Der Großteil ist strukturierte Text-, Config- und Analysearbeit an klar benannten Fundstellen, die Sonnet 5 sicher trägt. Die Schritte 13–16 sind der Ausreißer: eine Query, die über ~15 Prisma-Modelle vollständig sein muss, plus ein Test, der diese Vollständigkeit gegen das Schema erzwingt. Unvollständigkeit fällt dort nicht durch einen roten Test auf, sondern erst bei einem echten Auskunftsersuchen — genau die Sorte Fehler, für die das stärkere Modell den Aufpreis wert ist.
- **Abweichung von der Skill-Vorlage:** Die Modellliste im Skill nennt Sonnet 3.7 und Opus 4.8. Beide sind überholt; aktuell ist die Claude-5-Familie, und eine veraltete Modell-ID würde den Plan unbrauchbar machen. Ich habe deshalb die aktuellen IDs eingesetzt.

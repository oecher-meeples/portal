# Ausführungsplan: Sicherheits-Audit 2026-08-03 abarbeiten

- **Erstellt/Aktualisiert:** 2026-08-03
- **Ziel:** Die 15 Findings des Sicherheits-Audits als GitHub-Issues anlegen und in priorisierter Reihenfolge beheben.
- **Quelle:** [`.claude/plans/2026-08-03_AUSFUEHRUNGSPLAN_SECURITY.md`](2026-08-03_AUSFUEHRUNGSPLAN_SECURITY.md) (enthält die vollständigen Issue-Definitionen) und [`.claude/audits/2026-08-03_AUDIT_SECURITY.md`](../audits/2026-08-03_AUDIT_SECURITY.md) (Befunde mit Datei:Zeile)
- **Git-Base-State:** Branch `develop` @ `649681a`, Working Tree clean

> Befunde, Begründungen und Akzeptanzkriterien stehen in den beiden Quelldateien — hier nicht duplizieren. Jeder Schritt nennt sein Finding-Kürzel (`F1`–`F15`) und den Abschnitt der Quelldatei.

## Persona

Du bist Security-Engineer mit Schwerpunkt Next.js-App-Router-Anwendungen und arbeitest in einem TypeScript-Monorepo mit Prisma, Neon Postgres und Vercel-Deployment. Du kennst den Unterschied zwischen einem Advisory, das in der konkreten Konfiguration greift, und einem, das latent bleibt — und behandelst nur Ersteres als Bug. Du härtest minimal-invasiv: du änderst genau die Zeile, die das Finding verursacht, und schreibst dazu den Test, der das Regressionsverhalten festnagelt.

## Getroffene Annahmen

- **Branching:** Kein Feature-Branch. Alle Commits gehen direkt auf `develop` (Entscheidung des Nutzers). ⚠️ Issue **#36** („Branch-Schutz für develop aktivieren") ist offen — sollte der Schutz zwischenzeitlich aktiv sein und Direkt-Pushes ablehnen, dann Branch `security/audit-2026-08-03` anlegen, dort committen und am Ende einen PR eröffnen. Diesen Fall im Abschlussbericht vermerken.
- **Issue 10 (F1 + F4):** Wird angelegt, aber **nicht implementiert**. Der Agent recherchiert nur, was aus dem Repo und der öffentlichen Neon-/better-auth-Dokumentation ableitbar ist, dokumentiert das Ergebnis als Issue-Kommentar und markiert den Schritt als blockiert. Kein Code (Entscheidung des Nutzers).
- **Testframework:** Vitest ist vorhanden (`pnpm run test`). Kein Setup nötig, nur Verifikation.
- **Verschlüsselung:** Für F2 wird die bestehende `MEMBER_DATA_ENCRYPTION_KEY`-Infrastruktur mitgenutzt. Kein neues Schlüsselmaterial, keine neue Env-Variable.
- **CSP:** Wird in diesem Plan nur als `Content-Security-Policy-Report-Only` ausgeliefert. Das Scharfschalten braucht einen Preview-Deploy-Zyklus mit gesammelten Verstößen und ist Folgearbeit, kein Schritt hier.
- **Bewusst offen gelassen:** `brace-expansion` (`GHSA-mh99-v99m-4gvg`) — reine Dev-Dependency über ESLint, kein Laufzeitrisiko. Wird in der CI-Allowlist geführt, nicht behoben.
- **Überschneidungen mit offenen Issues** (aus den drei anderen Audits vom selben Tag) sind identifiziert und in den betroffenen Schritten vermerkt. Der Agent prüft vor jedem dieser Schritte den aktuellen Stand des überschneidenden Issues, um Doppelarbeit und Merge-Konflikte zu vermeiden:
  | Mein Finding | Überschneidet mit | Konflikt |
  | --- | --- | --- |
  | F6 (`CRON_SECRET`-Guard) | **#47** Env-Validierung | Beide fassen die Env-Prüfung an |
  | F11 (`shadcn` → devDependencies) | **#50** Runtime-Deps korrekt deklarieren, **#41** AGPL im Production-Tree | Alle drei ändern den Production-Dependency-Baum in `package.json` |
  | F13 (ICS-Größenlimit) | **#46** Externe Fetches ohne Timeout | Gleiche Funktion `fetchIcsFeed` |
  | F14 (`pnpm audit` in CI) | **#35**, **#37**, **#39** CI-Pipeline | Alle ändern `.github/workflows/ci.yml` |

## Regeln für die Ausführung

- Code auf Englisch, Benutzerausgaben auf Deutsch.
- **Repo-Regeln aus [`CLAUDE.md`](../../CLAUDE.md) gelten uneingeschränkt** — insbesondere die Schichten-Import-Richtung (`ui → entities → widgets → feature → layout`, `src/lib/**` importiert nie aus `src/components/**`). Die ESLint-Regel `import/no-restricted-paths` **nicht** aufweichen, um einen Import durchzubekommen; stattdessen den geteilten Code in die richtige Schicht verschieben.
- Halte dich an Best-Practices und das DRY-Prinzip. Ab der **zweiten** Kopie extrahieren — die Bausteintabelle in `CLAUDE.md` vor jeder neuen Hilfsfunktion prüfen.
- Verzichte auf überflüssige Kommentare; verweise bei Kontextbedarf auf die Quelldatei.
- Max. 400 Zeilen pro Datei (ESLint `max-lines`). Wird es mehr: entlang der Fachlichkeit teilen.
- **Unit-Tests:** Für neue Logik Unit-Tests schreiben. Die Definition of Done gilt erst als erfüllt, wenn die zugehörigen Tests grün sind. Ausgenommen sind rein mechanische Schritte (Config, Doku, Dependency-Bumps).
- **`pnpm run verify` (typecheck + lint + test) muss vor jedem Commit grün sein** — läuft auch als `pre-push`-Hook und in der CI.
- **Committe nur Dateien, die du selbst geschrieben hast** — gezielt `git add <datei>`, niemals `git add .`.
- **Blockierende Prozesse:** Du darfst Prozesse beenden, die eine für einen Schritt benötigte Ressource belegen (Port 3002 des Dev-Servers, Datei-Locks). Nur den identifizierten Prozess beenden, nicht den Schritt abbrechen.
- **Ein Schritt = ein abgeschlossener Commit** (Richtwert < 1 h).
- **Kein Secret in einen Commit.** Bei Arbeiten an Token-/Crypto-Pfaden (Schritte 4, 5) den Diff vor dem Commit gegenlesen; `.env.local` wird nie committet.
- **Bei Fehlschlag eines Schritts:** prüfen, ob die Definition of Done teilweise erfüllt ist. Falls ja, den Teilstand mit Präfix `wip:` committen; falls nein, nichts committen. In beiden Fällen den Schritt mit `[!]` markieren, den Fehler als Stichpunkt unter dem Schritt notieren und **mit dem nächsten Schritt fortfahren — nicht abbrechen**. Erst nachdem alle Schritte durchlaufen sind, alle offenen Punkte gesammelt auf Deutsch mit dem Nutzer besprechen.
- Markiere jeden erledigten Schritt mit `[x]`, sobald er abgeschlossen und committet ist. Trage die echten Issue-Nummern nach Schritt 0 in diesem Plan nach.

## Schritte

- [ ] **0. Vorbedingungen prüfen und Issues anlegen**
      `git status` muss clean sein und `git branch --show-current` `develop` liefern — sonst stoppen und den Nutzer fragen. Prüfen, ob der `security`-Label existiert (wurde in der Audit-Session angelegt); falls nicht: `gh label create security --color b60205`.
      Dann die 11 Issues aus dem Abschnitt „Issue-Definitionen" der Quelldatei anlegen: erst das Epic, dann Issues 1–10. Titel, Labels und Board-Spalte stehen je Definition dort. Body jeweils in eine temporäre Datei schreiben und per `gh issue create --body-file` übergeben — nicht inline, sonst zerlegt die Shell das Markdown.
      Anschließend den Epic-Body mit `gh issue edit <epic>` um die echten Nummern ergänzen (die `#TBD`-Platzhalter ersetzen), alle 11 Issues aufs Projects-Board `oecher meeples portal` (`PVT_kwDOCJfCSs4BertC`) legen — Spalte `Backlog`, Epic nach `Epics`, Issue 10 nach `Blocked` — und die Nummern in diesem Plan in den Schritt-Titeln nachtragen.
      _Definition of Done:_ `gh issue list --label security` listet 11 Issues, der Epic-Body enthält keine `#TBD` mehr, und dieser Plan nennt in jedem Schritt die echte Issue-Nummer.
      `git commit -m "chore(plans): record security audit issue numbers"`

- [ ] **1. Baseline festhalten**
      `pnpm run verify` ausführen (bestätigt, dass Vitest läuft und der Ausgangsstand grün ist) und `pnpm audit --json` in eine temporäre Datei schreiben, um den Vorher-Stand zu kennen. Die Zahlen (1 critical / 11 high / 3 moderate / 1 low) gegen den Bericht abgleichen — weichen sie ab, hat sich der Dependency-Baum seit dem Audit geändern; die Abweichung als Kommentar am Epic vermerken.
      _Definition of Done:_ `pnpm run verify` grün, Audit-Zahlen abgeglichen und bei Abweichung am Epic dokumentiert.
      Kein Commit — reiner Verifikationsschritt.

- [ ] **2. Cron-Endpoint fail-closed machen (Issue 1 · F6)**
      In [`src/app/api/cron/instagram-queue/route.ts`](../../src/app/api/cron/instagram-queue/route.ts): Guard ergänzen, der bei fehlendem `CRON_SECRET` mit `500` antwortet, **bevor** irgendeine der drei Aktionen läuft. Den Vergleich auf `crypto.timingSafeEqual` umstellen, mit vorheriger Längenprüfung (`timingSafeEqual` wirft bei ungleicher Puffer-Länge). Tests für alle drei Fälle: Env fehlt → `500`, Token falsch → `401`, Token korrekt → Job läuft.
      ⚠️ Vorher **#47** (Env-Validierung) prüfen: existiert dort bereits ein zentraler Env-Validierungsbaustein, diesen nutzen statt eines lokalen Guards.
      _Definition of Done:_ Drei neue Tests grün, `pnpm run verify` grün, kein Pfad mehr, auf dem ein fehlendes `CRON_SECRET` zu einem `200` führt.
      `git commit -m "fix(security): fail closed on missing CRON_SECRET and compare in constant time"`

- [ ] **3. Instagram-OAuth-State härten und Callback berechtigen (Issue 2 · F7 + F9)**
      In [`src/lib/instagram/oauth-state.ts`](../../src/lib/instagram/oauth-state.ts): `Secure` in `buildStateCookie` **und** `clearStateCookie` ergänzen. Den State-Wert an die Session binden statt ihn nur zu vergleichen — HMAC über Session-Kennung + Nonce, Schlüssel aus einer bestehenden Env-Variable, keine neue einführen.
      In [`src/app/api/auth/instagram/callback/route.ts`](../../src/app/api/auth/instagram/callback/route.ts): `getCurrentUser()` + `hasPermission(user.id, "instagram:connect")` **vor** dem Token-Tausch prüfen, bei Fehlen `403`. Vorbild ist [`connect/route.ts:8`](../../src/app/api/auth/instagram/connect/route.ts#L8), das die Prüfung korrekt macht.
      Tests: fehlende Berechtigung → `403` und `InstagramConnection` unverändert, State-Mismatch → `400`, Happy Path → Redirect wie bisher.
      _Definition of Done:_ Tests grün, `pnpm run verify` grün, State-Cookie trägt `Secure`/`HttpOnly`/`SameSite=Lax`, Callback ohne Berechtigung schreibt nichts.
      `git commit -m "fix(security): bind Instagram OAuth state to the session and gate the callback"`

- [ ] **4. Instagram-Access-Token verschlüsselt speichern (Issue 3 · F2)**
      `encryptSecret()` aus [`src/lib/utils/crypto.ts`](../../src/lib/utils/crypto.ts) beim Schreiben in `callback/route.ts` anwenden (beide Zweige: `update` und `create`). `decryptSecret()` an **allen** Lesestellen in [`src/lib/instagram/queue.ts`](../../src/lib/instagram/queue.ts) einsetzen; prüfen, dass `refreshConnectionIfNeeded()` das erneuerte Token ebenfalls verschlüsselt zurückschreibt.
      Sicherstellen, dass das Token in keinem Log und nicht im DB-Feld `instagramLastError` landet — die Fehlerpfade in `queue.ts` daraufhin durchsehen.
      Migrationsweg in der Commit-Message beschreiben: bestehende Klartext-Verbindungen sind nach dem Deploy nicht mehr lesbar, ein einmaliges Re-Connect durch einen Admin mit `instagram:connect` stellt sie wieder her. Kein Datenverlust darüber hinaus.
      _Definition of Done:_ Tests für Schreib- und Lesepfad grün, `pnpm run verify` grün, `accessToken` liegt im Format `v1:<iv>:<tag>:<ciphertext>` vor, Grep nach dem Token in Log-/Error-Pfaden ohne Treffer.
      `git commit -m "fix(security): encrypt the stored Instagram access token"`

- [ ] **5. Blob-Upload-Pfad normalisieren und Größe begrenzen (Issue 7 · F8)**
      Eine Normalisierungsfunktion in `src/lib/utils/` anlegen (**einmal** — sie hat zwei Aufrufer, damit greift DRY), die einen vom Client gelieferten `pathname` auf `${erwarteterPrefix}/${basename(pathname)}` reduziert und Traversal-Segmente verwirft. In [`markt/actions.ts:104`](../../src/components/feature/markt/actions.ts#L104) und [`admin-news/actions.ts:129`](../../src/components/feature/admin-news/actions.ts#L129) den Prefix serverseitig setzen statt vom Client zu übernehmen, plus `maximumSizeInBytes` (8 MB) ergänzen.
      In [`src/lib/utils/use-blob-upload.ts`](../../src/lib/utils/use-blob-upload.ts) die Fehlerursache an die UI durchreichen — die aktuelle Sammel-Meldung verschluckt sie.
      Tests: `"posts/../../evil.png"` wird auf den erlaubten Prefix normalisiert, fremder Prefix wird verworfen, Happy Path unverändert.
      _Definition of Done:_ Tests grün, `pnpm run verify` grün, kein signierter Pfad enthält mehr einen vom Client gewählten Prefix.
      `git commit -m "fix(security): normalise blob upload paths server-side and cap upload size"`

- [ ] **6. Gast-Action gegen fremde Event-IDs absichern (Issue 8 · F10)**
      In [`src/components/feature/guest-area/actions.ts`](../../src/components/feature/guest-area/actions.ts): `getGuestGameDetail` prüft, ob `eventId` ein aktuell laufendes, öffentliches Event ist, und gibt sonst `null` zurück. **Zuerst** in [`src/lib/events/`](../../src/lib/events/) nach einem bestehenden Helfer suchen (`findUpcomingEvents()`, `resolveSelectedEventId()` und Nachbarn) — keine eigene Query schreiben, wenn einer passt.
      Für `lookupGuestGame` abwägen, ob die gleiche Prüfung sinnvoll ist: dort werden keine Personendaten zurückgegeben, aber der Bestand ist unauthentifiziert enumerierbar. Entscheidung im Commit begründen.
      Namensumfang für Gäste entscheiden (Vorname statt vollem `displayName`, oder `displayName` als bewusste Abwägung) und die Entscheidung in [`docs/adr/0005-gaeste-scan-ean-statt-spiele-qr.md`](../../docs/adr/0005-gaeste-scan-ean-statt-spiele-qr.md) nachtragen — die ADR begründet den unauthentifizierten Pfad und muss die Datenpreisgabe mit abdecken.
      _Definition of Done:_ Tests grün (fremde/abgelaufene `eventId` → `null`, laufendes Event → Daten), `pnpm run verify` grün, ADR 0005 um den Namensumfang ergänzt.
      `git commit -m "fix(security): validate eventId before exposing explainer names to guests"`

- [ ] **7. ICS-Feed-Größe begrenzen und Preview-Cookie auf Secure setzen (Issue 9 · F13 + F12)**
      In [`src/lib/content/calendar.ts`](../../src/lib/content/calendar.ts): Größenlimit in `fetchIcsFeed` (5 MB) — `Content-Length` prüfen und den Body-Stream nach dem Limit abbrechen. Das dokumentierte „never throws"-Verhalten muss erhalten bleiben: Überschreitung führt zu `[]`, nicht zu einer Exception.
      In [`admin-preview-tier/actions.ts:21`](../../src/components/feature/admin-preview-tier/actions.ts#L21): `secure: true` ergänzen.
      ⚠️ Vorher **#46** („Externe Fetches ohne Timeout") prüfen — dasselbe `fetchIcsFeed`. Ist #46 schon umgesetzt, das Limit in die dort entstandene Struktur einbauen; ist es offen, hier gleich einen Timeout mitnehmen und #46 entsprechend kommentieren.
      _Definition of Done:_ Test „übergroße Antwort → `[]`" grün, `pnpm run verify` grün, Kalenderansichten (öffentlich und intern) und Tier-Umschalter manuell unverändert funktionsfähig.
      `git commit -m "fix(security): cap ICS feed size and set Secure on the preview tier cookie"`

- [ ] **8. Dependency-Fixes: sharp, postcss, shadcn (Issue 5 · F3 + F11 + F15)**
      `shadcn` in [`package.json`](../../package.json) von `dependencies` nach `devDependencies` verschieben — das entfernt `@hono/node-server` (F11) komplett aus dem Runtime-Baum und ist die bessere Lösung als ein Upgrade. `sharp` auf `>=0.35.0` und `postcss` auf `>=8.5.18` heben; beide sind transitiv über `next`, daher voraussichtlich per `pnpm.overrides`.
      ⚠️ **#50** („Runtime-Deps korrekt deklarieren") und **#41** („AGPL-Dependencies im Production-Tree") fassen denselben Dependency-Baum an. Vor dem Schritt deren Stand prüfen: sind sie offen, den `shadcn`-Verschub hier machen und in beiden Issues kommentieren, dass er erledigt ist; ist #50 schon umgesetzt, nur noch die Versions-Bumps.
      _Definition of Done:_ `pnpm audit --audit-level high` nennt `sharp`, `postcss` und `@hono/node-server` nicht mehr; nur die better-auth-Kette (Issue 10) und `brace-expansion` (bewusst offen) bleiben. `pnpm build` erfolgreich, Bild-Rendering über `next/image` und Tailwind-Ausgabe manuell verifiziert, `pnpm run verify` grün.
      `git commit -m "chore(deps): patch sharp, postcss and move shadcn to devDependencies"`

- [ ] **9. Security-Header ergänzen und CSP im Report-Only-Modus ausliefern (Issue 4 · F5)**
      `headers()` in [`next.config.ts`](../../next.config.ts) ergänzen: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `frame-ancestors 'none'` und `Permissions-Policy` mit `camera=(self)` — die Kamera braucht `<CodeScanner>`, alles Übrige aus.
      CSP **als `Content-Security-Policy-Report-Only`** hinzufügen, nicht scharf. `script-src` mit Nonce statt `unsafe-inline` aufbauen (Next.js braucht hier Sorgfalt — die Next-Doku zu CSP mit Nonce heranziehen). `img-src` um die Vercel-Blob-Domain, `connect-src` um den Neon-Auth-Origin ergänzen; keine Wildcards.
      Manuell prüfen: News-Detailseite, Admin-Dashboard, Kamera-Scanner, Markt-Bilder — alle vier ohne Report-Only-Verstoß in der Browser-Konsole. Verbleibende Verstöße als Kommentar an Issue 4 dokumentieren, damit das Scharfschalten später darauf aufbauen kann.
      _Definition of Done:_ Alle fünf Header in der Response eines Production-Builds vorhanden, CSP als Report-Only aktiv, vier Seiten manuell geprüft und Verstöße am Issue dokumentiert, `pnpm run verify` grün.
      `git commit -m "feat(security): add security headers and a report-only content security policy"`

- [ ] **10. CI: Vulnerability-Scan und Dependabot einrichten (Issue 6 · F14)**
      `pnpm audit --audit-level high` als Step in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) nach `test` ergänzen — blockierend, mit expliziter Allowlist für die bewusst offenen Funde (`brace-expansion`, better-auth-Kette solange Issue 10 offen ist). Die Entscheidung blockierend-vs-informativ in der Commit-Message begründen.
      `.github/dependabot.yml` anlegen: `package-ecosystem: npm` und `github-actions` (Actions sind ebenfalls Supply Chain), `directory: /`, wöchentlich, Ziel `develop`.
      ⚠️ **#35**, **#37** und **#39** ändern dieselbe Datei. Deren Stand prüfen und den neuen Step so einfügen, dass er nicht mit einem dort geplanten `next build`-Step oder der pre-push-Angleichung kollidiert. In den betroffenen Issues kommentieren.
      Dieser Schritt kommt **nach** Schritt 8, sonst schlägt die CI sofort an den dort behobenen Findings fehl.
      _Definition of Done:_ CI-Lauf zeigt den Audit-Step mit erwarteter Ausgabe, `dependabot.yml` valide (GitHub meldet keinen Parse-Fehler im Repo-Insights-Tab), `pnpm run verify` grün.
      `git commit -m "ci: add dependency vulnerability scan and dependabot"`

- [ ] **11. Neon-Auth-Klärung recherchieren und dokumentieren (Issue 10 · F1 + F4) — blockiert, kein Code**
      **Kein Code in diesem Schritt.** Recherchieren, was ohne Zugang zum Neon-Dashboard ableitbar ist: welche better-auth-Version `@neondatabase/auth` 0.4.2-beta transitiv zieht (`pnpm why better-auth`), welche Plugins der Code tatsächlich anspricht (Grep über [`src/lib/auth/`](../../src/lib/auth/)), ob `pnpm.overrides` auf `better-auth >=1.6.22` mit dem Peer-Range von `@neondatabase/auth` überhaupt verträglich wäre (nur prüfen, **nicht** anwenden), und was die öffentliche Neon-Auth-Doku zu PKCE, Account-Verlinkung und Login-Rate-Limits sagt.
      Ergebnis als Kommentar an Issue 10 schreiben, klar getrennt in „belegt" und „muss im Neon-Dashboard geprüft werden". Die fünf offenen Fragen (a)–(e) aus den Akzeptanzkriterien der Quelldatei explizit adressieren oder als unbeantwortbar markieren. Besonders herausstellen, ob `GHSA-g38m-r43w-p2q7` (Account-Takeover via OAuth-Auto-Link, die Credentials-plus-Google-SSO-Kombination aus ADR 0002) greift — das ist das einzige akut relevante Advisory der Kette.
      Schritt anschließend mit `[!]` markieren und als blockiert kennzeichnen. Issue 10 behält `blocked`.
      _Definition of Done:_ Issue 10 trägt einen Kommentar, der alle fünf Fragen entweder belegt beantwortet oder als „nur im Neon-Dashboard klärbar" ausweist, und benennt die konkrete nächste Handlung für den Nutzer.
      Kein Commit — die Recherche landet im Issue, nicht im Repo.

- [ ] **12. Abschluss: Issues schließen und Bericht nachführen**
      Jedes erledigte Issue schließen (Issues 1–9 nach Schritten 2–10), jeweils mit einem Kommentar, der auf den Commit verweist. Issue 10 offen und `blocked` lassen. Epic schließen, sobald alle Kinder außer Issue 10 geschlossen sind — sonst mit einem Kommentar zum Restumfang offen lassen.
      In [`.claude/audits/2026-08-03_AUDIT_SECURITY.md`](../audits/2026-08-03_AUDIT_SECURITY.md) einen Abschnitt „Stand der Umsetzung" mit Datum ergänzen: pro Finding `behoben` / `bewusst akzeptiert` / `offen`, bei akzeptierten Findings die Begründung. `brace-expansion` und die latenten better-auth-Advisories gehören dort als „akzeptiert" mit Begründung hinein.
      Ein Folge-Audit nach Abschluss von Issue 10 empfehlen.
      _Definition of Done:_ `gh issue list --label security --state open` listet nur noch Issue 10, der Audit-Bericht enthält den Umsetzungsstand für alle 15 Findings.
      `git commit -m "docs(audits): record implementation status of the 2026-08-03 security audit"`

## Empfohlenes Claude-Modell für die Umsetzung

- **Empfehlung:** `claude-sonnet-5` (Sonnet 5) für die Schritte 0–2 und 5–12; `claude-opus-5` (Opus 5) für Schritte 3, 4 und 9.
- **Reasoning/Thinking:** **an, Effort hoch** — gekoppelt an den schwierigsten Schritt (9, CSP mit Nonce in Next.js), nicht an den Durchschnitt.
- **Begründung:** Der Großteil ist gut umrissene Härtungsarbeit mit klarer Definition of Done, die Sonnet 5 zuverlässig erledigt. Drei Schritte rechtfertigen Opus 5: Schritt 3 (State an die Session binden) und Schritt 4 (Token-Verschlüsselung über alle Lese-, Schreib- und Refresh-Pfade, inklusive der Frage, wo das Token in Logs leaken könnte) sind Krypto-/Auth-Pfade, in denen eine plausibel aussehende, aber falsche Lösung die Lücke nur verschiebt. Schritt 9 ist notorisch fehleranfällig, weil eine Next.js-CSP mit Nonce das App-Router-Streaming-Verhalten berührt und ein zu strenger `script-src` die Hydration bricht — genau dort zahlt sich sorgfältigeres Abwägen aus.

> **Hinweis zu Schritt 0:** Die `gh issue create`-Aufrufe wurden in der Audit-Session zweimal vom Auto-Mode-Classifier blockiert. Sollte das erneut passieren, ist der Schritt nicht autonom ausführbar — dann stoppen und den Nutzer bitten, entweder eine Bash-Permission-Regel für `gh issue create` zu ergänzen oder die Issues aus dem Abschnitt „Issue-Definitionen" der Quelldatei manuell anzulegen. **Nicht** versuchen, die Blockade über einen anderen Weg zu umgehen.

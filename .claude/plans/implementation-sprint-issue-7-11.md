# Implementation Sprint: Issues #7 & #11

- **Erstellt:** 2026-07-30
- **Branch-Modus:** weiter (auf `develop`)
- **Board:** oecher meeples portal (#1), Status-Feld verifiziert, IDs in `.claude/project-board.json`
- **Issue-Refine-Ergebnis:** beide Issues bestätigt `ready`, keine Label-Änderung nötig

---

## Issue #7 — Newsroom-Widget zeigt keine Beiträge (Prisma NULL-Falle)

**Root Cause (verifiziert im Code):**
- [src/lib/content.ts:79](../../src/lib/content.ts#L79) `getLatestPosts()` — `where: { internal: { not: true } }`
- [src/lib/content.ts:69](../../src/lib/content.ts#L69) `getUpcomingEvents()` — identisches Muster, `type: { not: "BLOG" }, internal: { not: true }`
- Prisma übersetzt `not: true` bei einer nullable-Boolean-Spalte zu SQL `<> true`. Durch Drei-Werte-Logik verwirft das auch Zeilen mit `internal = NULL`.
- `getUpcomingEventsIncludingInternal()` ([content.ts:89](../../src/lib/content.ts#L89)) ist nicht betroffen (kein `internal`-Filter).
- Bestehende Tests in [content.test.ts](../../src/lib/content.test.ts) mocken Prisma und prüfen nur den `where`-Aufruf selbst (Zeilen 87, 126) — sie hätten den Bug nicht gefangen, da sie das reale NULL-Verhalten nicht simulieren.

**Fix-Ansatz:**
1. In beiden Funktionen den Filter auf ein Muster umstellen, das `NULL` korrekt als "nicht intern" behandelt, z. B. `OR: [{ internal: null }, { internal: false }]` (kombiniert mit dem bestehenden `type`-Filter bei `getUpcomingEvents` per `AND`).
2. Regressionstest ergänzen, der reale Prisma-Query-Semantik prüft (nicht nur den `where`-Aufruf mocken) — idealerweise gegen eine Test-DB oder mit einem Mock, der die Drei-Werte-Logik korrekt nachbildet (Posts mit `internal: null`, `internal: false`, `internal: true` im Fixture, Assertion auf das gefilterte Ergebnis-Array statt auf den Query-Parameter).
3. Beide AC-Punkte aus dem Issue abdecken: `getLatestPosts()` und `getUpcomingEvents()` liefern `internal: null` korrekt mit, `internal: true` bleibt ausgeschlossen.

**Aufwand:** klein, gut abgegrenzt, keine offene technische Frage.

**Modellempfehlung:** **Sonnet** — mechanischer, gut lokalisierter Bugfix mit klarer Spezifikation; kein Bedarf für tiefes architektonisches Reasoning.

---

## Issue #11 — Fehler beim manuellen Anlegen eines Spiels per EAN (Server Action Response ungültig)

**Root Cause (Hypothese, verifiziert bis zu diesem Punkt):**
- [src/proxy.ts:19-22](../../src/proxy.ts#L19-L22): bei Nicht-200-Antwort der Auth-Middleware wird die Response 1:1 durchgereicht.
- In `@neondatabase/auth`'s `next/server/middleware.ts` (via `dist/next/server/index.mjs`, Zeile ~1645) gibt der `redirect_login`-Zweig einen reinen `NextResponse.redirect(...)` zurück — keine serveraction-kompatible Antwort (kein `text/x-component`, kein Next-Action-Redirect-Encoding).
- Das erklärt den beobachteten Next.js-Fehler `E394`, wenn diese Middleware auf eine Server-Action-POST-Anfrage trifft, die sie als nicht authentifiziert einstuft.
- **Offen (Teil der Implementierung, nicht der Spezifikation):** warum genau dieser Server-Action-Aufruf (`createBoardGame` im Modus "Manuell") betroffen ist und andere Admin-Server-Actions augenscheinlich nicht — Session-Gültigkeit zum Anfragezeitpunkt war laut Issue noch nicht isoliert geprüft. `createBoardGame` selbst ([actions.ts:94-103](../../src/components/feature/admin-bestand/actions.ts#L94-L103)) enthält keine Auffälligkeiten (Permission-Check über `getCurrentUser()` + `hasPermission`, kein Redirect, kein Early-Throw) — der Fehler entsteht vor Erreichen der Action-Logik, auf Proxy-Ebene.

**Fix-Ansatz:**
1. Reproduzieren mit Netzwerk-Trace (Request-/Response-Header der fehlschlagenden POST-Anfrage), um zu bestätigen, ob tatsächlich `redirect_login` ausgelöst wird und die Session zu dem Zeitpunkt clientseitig als gültig gilt.
2. Falls bestätigt: in `src/proxy.ts` server-action-POST-Anfragen (Header `Next-Action` vorhanden) speziell behandeln — entweder Session vorab prüfen ohne die Middleware-Redirect-Antwort durchzureichen, oder bei erkannter Server-Action-Anfrage einen alternativen 401-Pfad zurückgeben, den der Next.js-Client korrekt verarbeiten kann, statt eines rohen Redirects.
3. Falls die Diskrepanz stattdessen an einem Timing-/Cookie-Refresh-Problem liegt (z. B. Middleware erneuert das Session-Cookie, aber die Browser-Fetch-Anfrage der Server Action sendet ein veraltetes Cookie mit), stattdessen dort ansetzen.
4. Regressionstest: Integrationstest, der die Middleware/Proxy-Logik gegen eine simulierte authentifizierte Server-Action-Anfrage prüft (kein 3xx-Redirect als Antwort auf einen `Next-Action`-Request).

**Aufwand:** mittel bis hoch — Root Cause ist plausibel, aber nicht abschließend verifiziert; erfordert Live-Reproduktion (Dev-Server + Browser) statt reiner statischer Analyse.

**Modellempfehlung:** **Sonnet mit hohem Reasoning-Effort**, ggf. unter Einsatz des `diagnosing-bugs`-Skills zur strukturierten Root-Cause-Bestätigung vor dem Fix — die Unsicherheit liegt nicht in der Codequalität, sondern im Nachweis der tatsächlichen Ursache in einer Live-Umgebung (Auth-Middleware-Interaktion mit Server Actions ist subtil und leicht durch einen falschen Fix zu verschlimmern, z. B. Sicherheitslücke durch übersprungenen Auth-Check).

---

## Reihenfolge & Ausführung

1. Issue #7 zuerst (isoliert, kein Blocker, schneller Erfolg).
2. Issue #11 danach (benötigt ggf. laufenden Dev-Server zur Reproduktion — `run`-Skill nutzen, um die App zu starten und den Fehler live zu bestätigen, bevor der Fix geschrieben wird).
3. Für beide: Status im Projects-Board auf "In progress" setzen, sobald die Umsetzung startet (Feld-/Options-IDs siehe `.claude/project-board.json`).

**Nächster Schritt:** frische Session starten und mit der Umsetzung gemäß diesem Plan beginnen.

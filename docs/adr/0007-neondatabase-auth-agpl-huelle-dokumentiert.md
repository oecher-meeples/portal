---
status: accepted
---

# `@neondatabase/auth`-Unterbaum: AGPL-Risiko dokumentiert, Vercel-Trace verifiziert

`@neondatabase/auth` löst transitiv über `@neondatabase/auth-ui` → `@daveyplate/better-auth-ui` → `@triplit/client`/`@triplit/db`/`@triplit/react` auf. `@triplit/client` deklariert im eigenen `package.json` ausdrücklich `"license": "AGPL-3.0-only"`. `@triplit/db` und `@triplit/logger` haben **kein** `license`-Feld im npm-Manifest — ohne ausdrückliche Lizenz besteht per Urheberrecht kein Nutzungsrecht, das ist der ungünstigste Ausgangspunkt, nicht der harmloseste. Da beide Pakete Teil desselben Triplit-Monorepos sind wie das AGPL-lizenzierte `@triplit/client`, ist AGPL-3.0-only auch für sie die naheliegende Annahme — bestätigt ist das aber nicht; das müsste am Upstream-Repository (nicht am npm-Manifest) geklärt werden, was in diesem Lauf nicht möglich war.

**Wir dokumentieren dieses Risiko und tauschen die Abhängigkeit bewusst nicht aus.** Ein Austausch von `@neondatabase/auth` gegen eine andere Auth-Lösung ist ein Refactor am Login-Pfad (Server- und Client-Session-Handling, Middleware, Cookie-Verwaltung) und dafür zu riskant, um ihn ungeplant vorzunehmen.

## Bundle-Befund (Merge-Schritt 20, Grundlage für diese Bewertung)

Nach `pnpm build` wurde `.next/server` und `.next/static` durchsucht:

- `@triplit` (client/db/logger/react): **0 Treffer** — `grep -rl "@triplit" .next/server .next/static`
- `@daveyplate`: **0 Treffer** — `grep -rl "@daveyplate" .next/server .next/static`
- `@neondatabase/auth-ui`: **0 Treffer** — `grep -rl "@neondatabase/auth-ui" .next/server .next/static`
- `ua-parser-js`: **8 Treffer**, aber bei näherer Prüfung (`grep -o ".\{80\}ua-parser-js.\{80\}" …`) stammen sie aus dem Pfad `next/dist/compiled/ua-parser-js/` — das ist Next.js' **eigene** vendorisierte Kopie für User-Agent-Parsing, nicht Bestandteil der `@neondatabase/auth`-Kette. Dieses Paket ist seit Version 2.0 bewusst dual-lizenziert (AGPL oder kommerzielle Lizenz); der Autor hat also ein Durchsetzungsinteresse. Ob Vercel für die in Next.js gebündelte Kopie eine kommerzielle Lizenz hält, können wir von hier nicht prüfen — das betrifft aber das Next.js-Framework, nicht dieses Repository.

Nur `src/lib/auth/server.ts` und `src/lib/auth/client.ts` importieren aus `@neondatabase/auth`; kein Code im Repository importiert `@triplit/*` oder `@daveyplate/*` direkt.

## Warum „nicht gebundelt" allein nicht genügt

AGPL §13 (Remote Network Interaction) greift beim **Betrieb** eines Netzwerkdienstes, nicht erst beim Ausliefern von Code an den Browser. Dass die Triplit-Pakete nicht ins ausgelieferte Bundle gelangen, beantwortet also nicht die eigentliche Frage — die wäre, ob und wie `@neondatabase/auth` diese Pakete zur **Laufzeit auf dem Server** tatsächlich nutzt (z. B. für Realtime-Sync-Funktionen, die dieses Portal nicht verwendet). Das haben wir in diesem Lauf nicht bis auf den Ausführungspfad zurückverfolgt.

## Vercel-Deployment-Trace verifiziert (#41, 2026-09-03)

Der Bundle-Grep in `.next/server`/`.next/static` oben deckt nur ab, was Webpack in die JS-Chunks einbettet — nicht, ob Vercels tatsächlicher Function-Bundler (`@vercel/nft`, Dependency-Tracing beim Deployment) zusätzliche `node_modules`-Dateien in das Serverless-Function-Artefakt zieht, die im Webpack-Output nicht auftauchen. Das war die einzige offene technische Unsicherheit aus #41.

Verifiziert per `vercel build` (lokaler Nachbau des exakten Vercel-Deployment-Traces, `vercel-cli@59.11.2`, gegen das verlinkte Projekt `jh-erwig/oecher-meeples-portal`): Next.js schreibt dabei für jede Route eine `*.nft.json` — das ist exakt das `@vercel/nft`-Traceergebnis, das Vercel für das reale Deployment verwendet, unabhängig vom `.vercel/output`-Symlink-Schritt (der auf Windows ohne Symlink-Rechte scheitert, aber nach der Trace-Phase liegt).

```
grep -rli "triplit\|daveyplate\|auth-ui\|neondatabase.auth" .next/server --include="*.nft.json"
```

**0 Treffer** über alle 64 erzeugten `.nft.json`-Dateien, inklusive `app/login/page.js.nft.json` und `app/api/auth/[...path]/route.js.nft.json` (die beiden Routen, die `@neondatabase/auth` tatsächlich importieren). `@neondatabase/auth` selbst taucht in den Traces ebenfalls nicht als externe Datei auf — es ist vollständig in die jeweiligen Webpack-Chunks eingebettet, das Nft-Tracing greift nur für den Rest (Prisma-Runtime, Next.js-eigene compiled Assets, …), der nicht statisch bundlebar ist.

**Damit ist die im Issue gestellte Given/When/Then-Bedingung erfüllt:** Der Trace zeigt ebenfalls 0 Treffer für die AGPL-Kette (`@triplit/*`, `@daveyplate/*`, `@neondatabase/auth-ui`) — das technische Restrisiko (Code wird zur Laufzeit nicht geladen/ausgeführt) gilt als abschließend dokumentiert geklärt. Kein Dependency-Austausch nötig.

Offen bleibt weiterhin, unabhängig von dieser technischen Frage: (1) die Upstream-Lizenz von `@triplit/db`/`@triplit/logger` ist am Triplit-Repository selbst nicht verifiziert (kein `license`-Feld im npm-Manifest), und (2) der LICENSE-Widerspruch (public Repo vs. "All rights reserved", siehe unten) — beides sind eigenständige, nicht-technische Punkte, die eine Vorstandsentscheidung erfordern, nicht eine erneute Code-Prüfung.

## Zusätzlicher Widerspruch

Das Repository ist **public**, die eigene [`LICENSE`](../../LICENSE) sagt „All rights reserved" und räumt Dritten nur akademische Ansicht ein. Das ist unabhängig von der Triplit-Frage ein eigener, ungeklärter Punkt.

## Consequences

- Kein Dependency-Austausch nötig — sowohl der Webpack-Bundle-Grep als auch der Vercel-`@vercel/nft`-Deployment-Trace zeigen 0 Treffer für die AGPL-Kette. Das technische Restrisiko aus #41 gilt als abschließend dokumentiert.
- Weiterhin offen, aber nicht-technisch und daher außerhalb der Reichweite eines erneuten Code-Checks: Upstream-Lizenz von `@triplit/db`/`@triplit/logger` und der LICENSE-Widerspruch (public Repo vs. "All rights reserved") — beides Sache des Vorstands, ggf. im Zuge von #48.
- Kommentar mit diesem Befund geht an #41.

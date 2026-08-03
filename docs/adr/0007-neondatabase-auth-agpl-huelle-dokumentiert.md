---
status: accepted
---

# `@neondatabase/auth`-Unterbaum: AGPL-Risiko dokumentiert, nicht behoben

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

## Zusätzlicher Widerspruch

Das Repository ist **public**, die eigene [`LICENSE`](../../LICENSE) sagt „All rights reserved" und räumt Dritten nur akademische Ansicht ein. Das ist unabhängig von der Triplit-Frage ein eigener, ungeklärter Punkt.

## Consequences

- Kein Dependency-Austausch in diesem Lauf. Das Risiko bleibt bestehen, bis der Vorstand/die Entwicklung entscheidet, ob `@neondatabase/auth` ersetzt wird.
- Vor jedem Produktions-Release sollte geklärt werden, ob `@neondatabase/auth` die Triplit-Pakete zur Laufzeit tatsächlich aktiv nutzt (nicht nur importiert) — das ist der eigentlich offene Punkt, nicht die Bundle-Frage.
- Kommentar mit diesem Befund geht an #41.

# Einladungs-Feature: gebundene & ungebundene Einladungen, Such-/Filterleisten, Copy-Aktionen

Status: geplant, noch nicht umgesetzt. Durchgegrillt mit dem `grilling`-Skill —
dieser Stand ersetzt alle früheren Zwischenstände dieses Dokuments.

## Kernmodell

Es gibt ab jetzt **zwei Einladungsarten**, unterschieden allein durch `email`:

- **Gebunden** (`email` gesetzt): genau einmal einlösbar, muss exakt (case-
  insensitiv) mit der bei der Registrierung eingegebenen E-Mail übereinstimmen.
- **Ungebunden** (`email = null`, in der Tabelle als **„\*"** angezeigt):
  beliebig oft einlösbar bis Ablauf oder Widerruf. Keine Protokollierung, wer
  oder wie oft eingelöst hat — `redeemedAt` bleibt bei dieser Art **immer**
  `null`.

Beide Arten haben eine vom Admin einstellbare Gültigkeitsdauer, die als
Minuten-Offset (`expiresIn`) persistiert wird, damit "Verlängern" dieselbe
Dauer später erneut anwenden kann.

## Entscheidungen (mit Nutzer abgestimmt, inkl. Grilling-Runde)

1. **Migration:** Die bereits angewendete Migration
   `prisma/migrations/20260812164858_invite_tracking/` (createdAt/revokedAt)
   bleibt unverändert — Faktencheck gegen die echte DB zeigte, dass sie
   entgegen einer früheren Zwischenantwort schon lief (`createdAt`/`revokedAt`
   existieren bereits, `prisma migrate status` meldet "up to date", 3
   Bestandszeilen vorhanden). `email` und `expiresIn` kommen daher in eine
   **neue, eigene Migration**.
2. **Bestandsdaten:** Die 3 vorhandenen Invite-Zeilen (aus einer Zeit vor dem
   E-Mail-Konzept) werden in dieser neuen Migration **gelöscht**
   (`DELETE FROM "invites";`), nicht mit einem Platzhalter befüllt.
3. **E-Mail-Abgleich:** case-insensitiv, beim Speichern lowercased. Gilt nur
   für gebundene Einladungen — bei ungebundenen entfällt der Abgleich
   komplett, jede eingegebene E-Mail wird bei der Registrierung akzeptiert.
4. **Kein Prefill-Lookup:** `/registrieren` füllt die E-Mail nur aus dem
   `email`-Query-Parameter des Links vor (readonly). Es gibt **keinen**
   Server-Roundtrip, der zu einer eingetippten Token-Eingabe eine E-Mail
   nachlädt — das würde einem Unauthenticated erlauben, über Token-Raten eine
   Adresse zu bestätigen (DSGVO-Bedenken). Alte/reine Token-Links ohne
   `email`-Parameter bleiben gültig, das Feld ist dann einfach frei
   editierbar.
5. **Duplikate (nur gebunden):** Erzeugt ein Admin eine neue Einladung für
   eine E-Mail, die bereits eine offene gebundene Einladung hat, wird
   **ohne Bestätigungsdialog** automatisch dieselbe Zeile verlängert
   (`extendInvite`, siehe unten) — **gleicher Token**. Die UI zeigt danach
   statt der normalen Erfolgsmeldung: *"E-Mail wurde bereits eingeladen,
   Gültigkeitsdauer wurde verlängert."* Kein DB-Unique-Constraint dagegen,
   reine App-Logik in `createInvite` reicht (Admin-only, geringe
   Nebenläufigkeit).
6. **Ungebundene Einladungen im Formular:** explizite Checkbox „Ungebundene
   Einladung (mehrfach nutzbar, keine E-Mail-Bindung)". Aktiviert, blendet sie
   das E-Mail-Feld aus/deaktiviert es — bewusst kein einfach leer gelassenes
   Pflichtfeld, damit die mächtigere/riskantere Einladungsart eine bewusste
   Entscheidung bleibt.
7. **Gültigkeitsdauer:** ein Formularfeld „Gültigkeit (Tage)" für **beide**
   Arten, Nachkommastellen erlaubt (z. B. 2,5). Default **1 Tag** (24 Std.)
   für ungebunden, **7 Tage** für gebunden — vom Admin frei überschreibbar.
   Grenzen: kein Minimum außer „> 0", **Maximum 183 Tage** (serverseitig
   erzwungen).
8. **`expiresIn`-Spalte:** `Int` (32-Bit), **Minuten, aufgerundet**. `smallint`
   (16-Bit, Bereich ±32 767 ≈ 22,75 Tage in Minuten) reicht nicht aus, sobald
   keine Tagesobergrenze existiert bzw. selbst bei der jetzigen 183-Tage-
   Grenze längst überläuft. PostgreSQL kennt zudem keine unsigned
   Integer-Typen. `Int` (32-Bit) reicht in Minuten bis ca. 4 085 Jahre —
   komfortabel ausreichend.
9. **Verlängern-Semantik:** `expiresAt = jetzt + expiresIn` wird **ab dem
   aktuellen Zeitpunkt neu berechnet**, nicht ab dem alten (ggf. lange
   vergangenen) `expiresAt` weitergerechnet. Gilt für beide Verlängerungs-
   Wege (Button und automatische Duplikat-Verlängerung).
10. **"Verlängern"-Button** bei abgelaufenen Einladungen: einfacher
    `ActionButton` mit `confirm`-Text, reicht `expiresIn` der Zeile selbst
    erneut an — **kein neuer Dialog**, keine erneute Tage-Eingabe nötig (löst
    sich elegant aus Punkt 8: die Dauer steckt schon in der Zeile).
11. **Token bleibt gleich** in beiden Verlängerungsfällen (Button und
    automatische Duplikat-Verlängerung) — "verlängern" heißt dieselbe
    Einladung länger gültig machen, nicht eine neue ausstellen.
12. **Filter-UI Einladungstabelle:** 4 unabhängige Toggle-Buttons (Offen /
    Abgelaufen / Eingelöst / Widerrufen), **Mehrfachauswahl** (kein
    Single-Select wie bei der Mitgliedertabelle), kein zusätzlicher
    "Alle"-Shortcut. Default: Offen + Abgelaufen aktiv.
13. **Filter-UI Mitgliedertabelle:** Single-Select-Button-Reihe (wie
    `admin-bestand-view.tsx`): Aktiv (Default) · Gekündigt · Ausgetreten ·
    Anonymisiert · Alle.
14. **Mailto-Button:** vierter Button neben den drei Copy-Buttons, öffnet den
    Mailclient (`mailto:`) mit vorausgefülltem Text — bei ungebundenen
    Einladungen ohne bekannten Empfänger bleibt das `to`-Feld einfach leer.
15. **Button-Look:** `variant="destructive"` (rot) für destruktive Aktionen,
    `variant="default"` (bereits Akzent-Gelb, `--primary: #ffde00`) für
    primäre — plus Icon aus `lucide-react`, wo sinnvoll. Wird auf derselben
    Seite gleich für drei bestehende Stellen mitgezogen (siehe Abschnitt 5).
16. **Neue Stat-Karte:** zwei `StatTile`s „Offene Einladungen" / „Abgelaufene
    Einladungen" direkt über der Einladungstabelle. Zeigt die **absolute**,
    vom aktuellen Such-/Filterzustand der Tabelle **unabhängige** Anzahl.

## 1. Datenmodell (`prisma/schema.prisma`)

```prisma
model Invite {
  id              String    @id @default(cuid())
  token           String    @unique
  /// null = ungebunden: beliebig oft einlösbar, keine Protokollierung.
  /// Gesetzt = gebunden: genau einmal einlösbar, muss beim Einlösen exakt
  /// (case-insensitiv) übereinstimmen. Immer lowercased gespeichert.
  email           String?
  createdByUserId String
  createdAt       DateTime  @default(now())
  /// Gewählte Gültigkeitsdauer in Minuten (aufgerundet) — Offset, nicht
  /// Zeitpunkt. Wird bei "Verlängern" erneut auf `expiresAt` angewendet.
  expiresIn       Int
  expiresAt       DateTime
  redeemedAt      DateTime?
  /// Admin-initiierte Ungültigmachung einer noch offenen Einladung.
  revokedAt       DateTime?

  @@map("invites")
}
```

- Neue Migration (Name z. B. `invite_email_binding`):
  ```sql
  -- Invites lassen sich jetzt an eine E-Mail binden (einmal einlösbar) oder
  -- ungebunden lassen (mehrfach einlösbar bis Ablauf, zeigt sich als "*").
  -- `expiresIn` persistiert die gewählte Dauer als Minuten-Offset, damit
  -- "Verlängern" sie später erneut anwenden kann. Die 3 Bestandszeilen
  -- stammen aus der Zeit vor diesem Konzept und werden gelöscht statt mit
  -- einem bedeutungslosen Platzhalter befüllt.
  DELETE FROM "invites";

  ALTER TABLE "invites" ADD COLUMN "email" TEXT;
  ALTER TABLE "invites" ADD COLUMN "expiresIn" INTEGER NOT NULL;
  ```
  (Tabelle ist zu diesem Zeitpunkt leer, daher keine `DEFAULT`-Klausel für
  `expiresIn` nötig.)
- `docs/schema.md`: Absatz zu `Invite` korrigieren — nicht mehr "trägt keinen
  Personenbezug", sondern die Zweiteilung gebunden/ungebunden erklären.

## 2. `src/lib/members/invites.ts`

- `InviteRow` um `email: string | null` und `expiresIn: number` erweitern.
- `listInvites()`: beide Felder mitgeben.
- `validateInviteToken` / `inviteStatus`: **unverändert** — funktionieren für
  beide Invite-Arten bereits korrekt, weil `redeemedAt` bei ungebundenen
  Einladungen einfach nie gesetzt wird (kein Sonderfall im Code nötig).
- Neue Query-Funktion `findOpenInviteByEmail(email)` (lowercased Vergleich,
  nur `status === "offen"`), analog zur Schreiben/Lesen-Trennung in
  `holdings.ts`/`holdings-lookup.ts`.
- Neue Hilfsfunktionen:
  - `daysToMinutes(days: number): number` — `Math.ceil(days * 24 * 60)`.
  - `computeExpiresAt(expiresInMinutes: number, now = new Date()): Date`.
  - Konstanten `MIN_INVITE_DAYS` (> 0, keine feste Zahl, nur Validierung),
    `MAX_INVITE_DAYS = 183`, `DEFAULT_BOUND_DAYS = 7`,
    `DEFAULT_UNBOUND_DAYS = 1`.

## 3. `src/components/feature/admin-mitglieder/invite-actions.ts`

```ts
export async function createInvite({
  email,
  days,
}: {
  email: string | null;
  days: number;
}) {
  const admin = await requireInvitesManage();
  assertValidDays(days); // > 0 und <= MAX_INVITE_DAYS, sonst Error
  const expiresIn = daysToMinutes(days);
  const normalizedEmail = email?.trim().toLowerCase() || null;
  if (normalizedEmail) assertValidEmailFormat(normalizedEmail);

  if (normalizedEmail) {
    const existing = await findOpenInviteByEmail(normalizedEmail);
    if (existing) {
      const updated = await applyExpiresIn(existing.id, expiresIn);
      revalidatePath("/admin/mitglieder");
      return {
        token: updated.token,
        email: normalizedEmail,
        expiresAt: updated.expiresAt.toISOString(),
        extended: true as const,
      };
    }
  }

  const invite = await prisma.invite.create({
    data: {
      token: randomBytes(24).toString("hex"),
      createdByUserId: admin.id,
      email: normalizedEmail,
      expiresIn,
      expiresAt: computeExpiresAt(expiresIn),
    },
  });

  revalidatePath("/admin/mitglieder");
  return {
    token: invite.token,
    email: normalizedEmail,
    expiresAt: invite.expiresAt.toISOString(),
    extended: false as const,
  };
}

/** Shared by the duplicate-email path above and the "Verlängern"-Button. */
async function applyExpiresIn(id: string, expiresIn?: number) {
  const invite = await prisma.invite.findUniqueOrThrow({ where: { id } });
  const minutes = expiresIn ?? invite.expiresIn;
  return prisma.invite.update({
    where: { id },
    data: { expiresIn: minutes, expiresAt: computeExpiresAt(minutes) },
  });
}

/** Reapplies the invite's own stored `expiresIn` from now — no new input. */
export async function extendInvite(id: string) {
  await requireInvitesManage();
  await applyExpiresIn(id);
  revalidatePath("/admin/mitglieder");
  return { success: true as const };
}
```

- `revokeInvite`: unverändert.

## 4. `src/components/feature/registrieren/actions.ts`

- `redeemInvite`: lädt Invite per Token. Wenn `invite.email` gesetzt ist,
  muss `email.toLowerCase() === invite.email` sein, sonst Fehler ("Diese
  Einladung ist an eine andere E-Mail-Adresse gebunden."). Ist
  `invite.email === null`, entfällt die Prüfung komplett.
- Die abschließende Transaktion setzt `redeemedAt` **nur**, wenn
  `invite.email` gesetzt ist (gebunden) — bei ungebundenen Einladungen bleibt
  die Invite-Zeile unverändert, nur `UserRole` wird erzeugt.

## 5. UI — Mitgliedertabelle (`admin-mitglieder-view.tsx`)

- Tabellen-Wrapper: `bg-card` ergänzen.
- Client-Wrapper mit Suchfeld (Icon `Search`, filtert `displayName`) + Single-
  Select-Quick-Filter (`Aktiv` Default · `Gekündigt` · `Ausgetreten` ·
  `Anonymisiert` · `Alle`), `useMemo`-Filterung wie in `admin-bestand-view.tsx`.
- Button-Look-Pass auf derselben Seite:
  - „Kündigung widerrufen" ([admin-mitglieder-view.tsx:237-244](../../src/components/feature/admin-mitglieder/admin-mitglieder-view.tsx#L237-L244)):
    `ghost` → `outline` + `RotateCcw`-Icon.
  - `resign-membership-dialog.tsx:31`: Trigger `ghost` → `destructive` +
    Icon (`UserMinus`).
  - `anonymise-meeple-dialog.tsx`: `DESTRUCTIVE_OUTLINE`-Klasse entfernen,
    `variant="destructive"` + Icon (`ShieldOff`).

## 6. UI — Einladungen (`invite-form.tsx` + Tabelle)

- **`invite-form.tsx`**:
  - Checkbox „Ungebundene Einladung (mehrfach nutzbar, keine E-Mail-Bindung)".
  - E-Mail-Feld: `required` und sichtbar, außer Checkbox aktiv (dann
    ausgeblendet/deaktiviert).
  - Neues Zahlenfeld „Gültigkeit (Tage)", Default reagiert auf die Checkbox
    (1 bzw. 7), `min` knapp über 0, `max={183}`, Nachkommastellen erlaubt.
  - Layout auf volle Breite, Submit-Button `variant="default"` + `UserPlus`.
  - Ergebnisbehandlung: wenn `extended === true`, Hinweistext *"E-Mail wurde
    bereits eingeladen, Gültigkeitsdauer wurde verlängert."* statt der
    normalen Link-/Copy-Ansicht (der Link ist trotzdem identisch gültig,
    kann also trotzdem angezeigt werden — nur die Formulierung ändert sich).
- **Neuer Baustein** `components/ui/copy-button.tsx`:
  `<CopyButton value={string} label={string} icon={...}>` — kapselt
  `navigator.clipboard.writeText` + kurzes "Kopiert!"-Feedback,
  `variant="outline"`. Drei Verwendungsstellen → DRY-Pflicht.
- **Mailto-Button**: vierter Button, `<Button variant="outline" render={<a href={mailtoHref} />}>` + `Mail`-Icon. Bei ungebundenen Einladungen ohne
  `to`-Adresse (leer).
- **Tabelle**: Spaltenreihenfolge `E-Mail` → `Status` → `Erzeugt von` →
  `Erzeugt am` → `Läuft ab / eingelöst am` → Aktionen.
  - `email ?? "*"` in der ersten Spalte.
  - `bg-card` auf den Wrapper.
  - Suchfeld (filtert `email`, `null`/`"*"`-Zeilen matchen nie auf einen
    Suchtext — nur bei leerem Suchfeld sichtbar, das ist die akzeptierte
    Konsequenz und braucht keine Sonderbehandlung).
  - 4 Toggle-Buttons (Mehrfachauswahl) für den Status, Default Offen+Abgelaufen.
  - Aktionsspalte:
    - offene Einladungen: Token kopieren / Einladung kopieren / Link kopieren
      / Per Mail versenden (alle vier via `CopyButton`/Mailto-Button) +
      `Widerrufen` (`variant="destructive"` + `Ban`-Icon, aktuell `ghost`).
    - abgelaufene Einladungen: **„Verlängern"**-Button
      (`<ActionButton action={extendInvite.bind(null, invite.id)} confirm="Diese Einladung um ihre ursprüngliche Gültigkeitsdauer verlängern?">`,
      `variant="outline"` + Icon, z. B. `RotateCcw`).
  - Einladungstext-Vorlage (aktuell nur `mailtoHref`-Body in
    `invite-form.tsx`) wird zur gemeinsamen Quelle für Mailto-Button *und*
    "Einladung kopieren" — als Formatierungs-Funktion nach
    `src/lib/members/invites.ts` ziehen.
  - **Neue Stat-Card**: `StatTile`-Paar „Offene Einladungen" (Anzahl
    `status === "offen"` über *alle* geladenen `invites`, ungefiltert) und
    „Abgelaufene Einladungen" (Anzahl `status === "abgelaufen"`, ebenfalls
    ungefiltert), eigene `bg-card`-Card über der Tabelle.

## 7. UI — Registrierung (`register-form.tsx`)

- Liest `email`-Query-Param zusätzlich zu `token`.
- Vorhanden → Feld befüllt + `readOnly`. Nicht vorhanden (alter Link, Token
  von Hand eingegeben, oder ungebundene Einladung) → Feld frei editierbar,
  **kein** Server-Roundtrip zum Nachladen einer E-Mail zu einem Token.
- Serverseitige Prüfung in `redeemInvite` fängt eine falsche/fremde E-Mail
  bei gebundenen Einladungen beim Absenden ab; bei ungebundenen ist jede
  E-Mail zulässig.

## 8. Tests

- `invites.test.ts`: `BASE_INVITE` um `email: null` und `expiresIn` ergänzen.
  Bestehende Tests bleiben grün, da `inviteStatus`/`validateInviteToken`
  unverändert sind. Neue Tests für `daysToMinutes`/`computeExpiresAt`
  (Rundung, Grenzen).
- Neuer Test-Fokus in einer `invite-actions.test.ts` (bisher keine Tests für
  diese Datei) oder — falls Server Actions mit `requirePermission` schlecht
  isoliert testbar sind — zumindest für die extrahierten reinen Funktionen
  (`findOpenInviteByEmail`, `applyExpiresIn`-Logik, Tage-Validierung):
  - Duplikat-Erzeugung verlängert statt neu anzulegen, gleicher Token.
  - Tage außerhalb `(0, 183]` werden abgelehnt.
  - Ungebundene Einladung: `email: null`, `redeemedAt` bleibt nach
    (simuliertem) Einlösen `null`.
- `redeemInvite`-Tests (aktuell keine vorhanden, fällt laut
  `vitest.config.ts` unter die Coverage-Pflicht für
  `components/**/actions.ts`):
  - Gebunden + falsche E-Mail → Fehler.
  - Gebunden + richtige E-Mail (andere Schreibweise, Groß/klein) → Erfolg.
  - Ungebunden + beliebige E-Mail → Erfolg, `redeemedAt` bleibt `null`.

## 9. Doku

- `docs/schema.md`: `Invite`-Beschreibung auf die Zweiteilung
  gebunden/ungebunden umschreiben.
- `CLAUDE.md`-Tabelle „Vor dem Wiedererfinden" um `<CopyButton>` ergänzen.

## Offene Punkte

Keine — Icon-Vorschläge (`RotateCcw`, `UserMinus`, `ShieldOff`, `Ban`, `Mail`,
`Copy`, `Link`, `UserPlus`) werden wie im Plan angegeben übernommen. Wording
(Hinweistexte, Button-Labels, Confirm-Texte) darf bei der Umsetzung frei
feingeschliffen werden, solange die im Plan festgelegte Bedeutung erhalten
bleibt.

**Plan ist vollständig durchgegrillt und freigegeben — bereit zur Umsetzung.**

# Vereinsmitglied/Meeple-Split — Ausführungsplan

**Issues:** #215, #264, #328, #329, #330, #331, #332, #333, #334, #335 (alle `ready`)
**Konzept:** [docs/mitglieder-konzept.md](../../docs/mitglieder-konzept.md), [CONTEXT.md](../../CONTEXT.md)
**PR-Strategie:** ein einziger PR am Ende für den gesamten Umfang, zwei Migrationen (`UserRole` mehrfachrollen-/zeitfenster-fähig; `Vereinsmitglied`-Split inkl. `GameHolding`-Umstellung), kein Zwischen-PR pro Arbeitspaket.

## Board-Disziplin

1. Vor Start von Paket 1: alle 10 Issues → **In progress**.
2. Nach Abschluss von Paket 6 (letztes UI-Paket) und grünem `pnpm run verify`: alle 10 Issues → **In review**.
3. Danach: diese Plandatei löschen, PR erstellen.

## Bereits vorhandener Code (nicht neu bauen, nur ergänzen/prüfen)

Recherche im Repo zeigt: der Dual-Listbox-Teil von **#215** existiert bereits —
`RolePermissionsEditor` ([role-permissions-editor.tsx](../../src/components/feature/admin-mitglieder/role-permissions-editor.tsx)),
`RoleManagementSection` ([role-management-section.tsx](../../src/components/feature/admin-mitglieder/role-management-section.tsx)) und die Server Actions
`createRole`/`updateRole`/`deleteRole`/`setRolePermissions` ([actions.ts](../../src/components/feature/admin-mitglieder/actions.ts)) sind fertig, inkl. Tests
(`role-management-section.test.tsx`, `role-permissions-editor.test.tsx`). Paket 6 prüft nur noch Anschluss/Konsistenz mit #335, kein Neubau.

Ebenfalls vorhanden und Ausgangspunkt für die jeweiligen Pakete: `getMembershipState()` in
[membership-state.ts](../../src/lib/members/membership-state.ts) (liest heute `Meeple`-Felder, wandert in Paket 2 auf `Vereinsmitglied`),
`anonymiseMeepleRecord()` in [anonymisation.ts](../../src/lib/members/anonymisation.ts) (einstufig, wird in Paket 4 in drei Stufen aufgeteilt),
`setMeepleRole()`/`MeepleRoleSelect` (Single-Select, wird in Paket 1 mehrfachrollenfähig), `hasPermission()`/`requirePermission()` in
[permissions.ts](../../src/lib/auth/permissions.ts) (bleiben unverändert, Paket 1 erweitert nur den Katalog in `seed-roles.ts`).

---

## Paket 1 — Permission-Katalog + Mehrfachrollen + Zeitfenster (#335, #264)

**Schicht:** `src/lib/auth/`, `prisma/seed-roles.ts`, `prisma/schema.prisma`
**Abhängigkeit:** keine — Fundament für Pakete 4 (Ausgetreten-Rolle) und 6 (Rollen-UI).
**Migration:** eine gemeinsame Migration für `UserRole`:
- `UserRole` verliert `@@id([neonAuthUserId, roleId])` zugunsten von `id String @id @default(cuid())` + `@@unique([neonAuthUserId, roleId, startsAt])` (mehrere Zeitfenster derselben Rolle über die Zeit müssen möglich bleiben, exakt-doppelte Zuweisung im selben Fenster nicht).
- Neue Felder: `startsAt DateTime` (Pflicht, `@default(now())` für Altdaten-Backfill), `endsAt DateTime?`.
- Datenmigration: bestehende `UserRole`-Zeilen bekommen `startsAt = now()` (oder `createdAt`, falls sinnvoll ergänzt), `endsAt = null`.

**Aufgaben:**
- [x] Permission-Katalog um reguläre Meeple-Rechte erweitern (`ludothek:view`, `ludothek:borrow`, `news:internal:view`, `lfg:participate`, `market:participate`) — Bestandsaufnahme erledigt (Ludothek-Seiten, interne News, LFG, Marktplatz, jeweils Seite + Server Actions).
- [x] Standardrolle "Meeple" bekommt den vollen neuen Katalog zugewiesen (`seed-roles.ts`, `REGULAR_MEEPLE_PERMISSION_KEYS` exportiert für Paket 4).
- [x] Betroffene Seiten/Server Actions auf `requirePermission`/`requireAdminPermission`/`requireMeeplePermission` umgestellt statt impliziten Login-Checks.
- [x] `setMeepleRole` durch `assignMeepleRole`/`removeMeepleRole` (`src/lib/auth/user-roles.ts`) ersetzt, erfordert `admin:access` für die Zeitfenster-Variante (#264-Vorgabe), sonst `members:manage`.
- [x] Aktive-Rollen-Abfrage (`getUserPermissionKeys`, `hasPermission`) filtert `endsAt` in der Vergangenheit heraus, aber löscht/versteckt den Datensatz nicht (Query-Filter, kein Cron).
- [x] `MeepleRoleSelect` UI auf Mehrfachauswahl umgestellt (Badges + Add-Select statt `<select>`), inkl. Anzeige von `startsAt`/`endsAt` pro abgelaufener Zuweisung.
- [x] Audit-/Historien-Ansicht für abgelaufene Zuweisungen (`<details>` je Meeple-Zeile) — UI-Feinschliff bleibt Paket 6 vorbehalten.

**Test-Scope:** `src/lib/auth/permissions.test.ts`, `roles.test.ts` (Ablauf-Filterung, Mehrfachrollen-Zuweisung, Permission-Gate für Zeitfenster-Vergabe), Coverage-Pflicht laut `vitest.config.ts` (`src/lib/**`).

---

## Paket 2 — Vereinsmitglied-Tabelle (#328)

**Schicht:** `src/lib/members/`, `prisma/schema.prisma`
**Abhängigkeit:** Paket 1 nicht zwingend nötig, aber inhaltlich das Fundament für Pakete 3–6.
**Migration:** Teil derselben, einzigen Vereinsmitglied/Meeple-Split-Migration wie Paket 5 (`GameHolding`) — siehe Migrationshinweis dort. Diese Migration:
- Neues Modell `Vereinsmitglied` (Modellname im Schema z. B. `Member`, siehe Issue-Vorschlag): `memberNumber Int @unique`, `lastName String?`, `firstName String?`, `birthDate DateTime?`, `birthPlace String?`, `street String?`, `postalCode String?`, `city String?`, `phone String?`, `email String @unique`, `selbstgewaehlterBeitrag Decimal?`, IBAN-Felder (`ibanEncrypted`, `ibanLast4`, `accountHolder`), `resignedAt DateTime?`, `membershipEndsAt DateTime?`, `meepleId String? @unique`.
- Nur `memberNumber` und `email` sind Pflicht — alle anderen Personenfelder `nullable`, **kein Platzhalter-Backfill**.
- `Meeple.email`, `.ibanEncrypted`, `.ibanLast4`, `.accountHolder`, `.resignedAt`, `.membershipEndsAt` werden entfernt.
- Datenmigration: jede bestehende `Meeple`-Zeile bekommt eine begleitende `Vereinsmitglied`-Zeile (1:1 im heutigen Bestand), befüllt nur mit tatsächlich vorhandenen Werten (E-Mail, IBAN, `memberNumber`, `resignedAt`, `membershipEndsAt`).

**Aufgaben:**
- [x] Schema wie oben.
- [x] `getMembershipState()` von `Meeple`- auf `Vereinsmitglied`-Felder umstellen (Signatur/Aufrufer in `membership-state.ts` anpassen).
- [x] `resignOwnMembership`/`recordResignation`/`revokeResignation` (`actions.ts`) auf `Vereinsmitglied` umstellen.
- [x] Dashboard-31-Tage-Warnung (`src/lib/members/dashboard.ts`) auf `Vereinsmitglied.membershipEndsAt` umstellen.
- [x] Beitragsart-Ableitung (`MiniMeeple`/`JungMeeple`/`Meeple`-Kategorie) aus `birthDate`, `selbstgewaehlterBeitrag` überstimmt; ohne `birthDate` und ohne `selbstgewaehlterBeitrag` → unbestimmt (kein Rateversuch). Neue Funktion, z. B. `src/lib/members/contribution.ts`.
- [x] `membershipEndsAt`-Berechnung mit 4-Wochen-Mindestfrist vor dem 31.12. (`nextTurnOfTheYear`-Nachfolger in `membership-state.ts` erweitern).
- [x] Bank-Zugriffs-Log (`bank-access-log.ts`) und `revealMemberIban`-Action auf `Vereinsmitglied` umstellen (IBAN wandert dorthin).

**Test-Scope:** `membership-state.test.ts` (neu, ersetzt/ergänzt bestehende Tests), Beitragsart-Ableitung, 4-Wochen-Regel-Grenzfälle (10. Dezember → übernächster 31.12.), Migrationsskript-Verifikation (kein Fake-Backfill).

---

## Paket 3 — Einladungen, IBAN-/E-Mail-Änderungsanträge (#329, #330)

**Schicht:** `src/lib/members/` (`invites.ts`, neues `pending-changes.ts`), `src/components/feature/admin-mitglieder/`
**Abhängigkeit:** Paket 2 (Vereinsmitglied-Tabelle). Parallelisierbar mit Paket 4 und 5.

### 3a — Einladungen (#329)
- [x] `Invite.email` von `String?` auf `String` (Pflicht) — ungebundener Invite-Typ entfernt, Migration löscht bestehende `email: null`-Zeilen (Demo-Daten, siehe `20260830032816_paket3_invites_pendingchanges`).
- [x] "Einladung erstellen/verlängern": `InviteForm` wählt jetzt ein `Member` ohne Login statt Freitext-E-Mail (`listMembersWithoutLogin()`), `createInvite({ memberId, days })` übernimmt `Member.email` serverseitig.
- [x] Redeem-Flow: legt neues `Meeple` an (Displayname aus Vor-/Nachname, Fallback Signup-Name), verknüpft `Member.meepleId` — direkt in der Transaktion, nicht erst über `ensureMeeple()` beim nächsten Login.
- [x] Separate "Neues Mitglied einladen"-Ansicht — **geprüft, existiert nicht getrennt**: `invite-form.tsx` war schon Teil der Mitglieder-Tabellen-Seite, nur der ungebundene Zweig wurde entfernt.
- [x] Neue Einstellung "Gültigkeitsdauer für Einladungen" auf `/admin/einstellungen/einladungen` (Default 7 Tage, `invites:manage`, `InviteSettings`-Singleton), ersetzt Pro-Invite-Auswahl als Vorbelegung.
- [ ] Popup bei E-Mail-Änderung eines Vereinsmitglieds mit offener Einladung: Widerrufen-und-neu-erstellen-Dialog — **verschoben nach Paket 6**, da es keine Admin-UI zum Bearbeiten von `Member.email` vor dem dortigen Vereinsmitglieder-Akkordeon gibt (kein Wegwerf-Dialog vorab).
- [x] **Systemkonto anlegen** (kein Invite): Button oberhalb der Meeple-Tabelle (`admin:access`), `auth.admin.createUser({ email, name, password })` + `Meeple` ohne Vereinsmitglied-Referenz + `auth.requestPasswordReset()` (`src/lib/members/systemkonto.ts`). **Blocker-Ergebnis:** `@neondatabase/auth`s Server-Typen lösen `admin`/`requestPasswordReset` strukturell auf `unknown` auf (kein Plugin-Typinferenz-Pfad) — mit lokalen Minimal-Signaturen implementiert, **ungetestet gegen die echte Neon-Auth-API** (nur Unit-Test mit gemocktem `auth`). Vor produktivem Einsatz einmal manuell smoke-testen, ob `admin:access` (unser Modell) tatsächlich ausreicht oder Neon Auth serverseitig zusätzlich eine eigene Rollen-/Admin-Konfiguration verlangt.
- [x] Voraussetzung `#324` ("Passwort vergessen"-Flow) geprüft — **weiterhin offen** (kein `requestPasswordReset`/`forgot-password`/`reset-password`-Flow im Code), Systemkonto-Feature ist auf `auth.requestPasswordReset()` als einzigen Weg zu einem nutzbaren Passwort angewiesen; das ist derselbe ungetestete Aufruf wie oben.

### 3b — IBAN-/E-Mail-Änderungsanträge (#330)
- [x] `PendingChange`-Modell (`kind: IBAN | MEMBER_EMAIL`) — eigene Migration (nicht mehr Teil von 2/5, die waren zu dem Zeitpunkt schon deployed), siehe `20260830032816…`/`20260830180000_pending_change_confirm_token` (Reihenfolge-Bug beim ersten Anlauf entdeckt und korrigiert: Migrationsordner-Timestamps müssen nach Wirkreihenfolge sortieren, nicht nach Erzeugungszeitpunkt — sonst schlägt eine frische Shadow-DB-Replay fehl, auch wenn `migrate deploy` gegen die schon migrierte Dev-DB durchläuft).
- [x] Gemeinsamer Baustein `src/lib/members/pending-changes.ts` (Antrag stellen/bestätigen/freigeben/ablehnen inkl. Ablehnungs-Mail an die *aktuelle* Adresse) + `pending-change-actions.ts` (Server-Action-Gate, kind-abhängige Permission) — von beiden `kind`-Werten genutzt.
- [x] IBAN: neuer Antrag ersetzt automatisch offenen (`replaceOpenPendingChange`), Freigabe exklusiv Kassenwart (`bank:read`), Löschen nur nach Kündigung (`requestIbanClearing` prüft `resignedAt`).
- [x] Vereinsmitglied-E-Mail: Bestätigungslink (`/mitglied/e-mail-bestaetigen`) **und** Vorstandsfreigabe (`members:manage`) nötig, bevor `Member.email` ersetzt wird — `approvePendingChange` verweigert die Freigabe ohne `confirmedAt`.
- [x] Login-E-Mail/`Meeple.email`: **weiterhin nicht änderbar** — kein Bestätigungslink-Flow existiert dafür im Repo (#324-Nachbarthema), bewusst nicht in diesem Paket nachgebaut; nur die Abgrenzung zur Vereinsmitglied-E-Mail ist jetzt im Code dokumentiert (Kommentar in `member-email-change-dialog.tsx`).
- [x] Minimale Admin-UI: `PendingChangesPanel` (`components/widgets/pending-changes/`, DRY zwischen `/admin/bank` und `/admin/mitglieder`) — Freigeben/Ablehnen-Buttons. Tiefere Integration ins Vereinsmitglieder-Akkordeon folgt in Paket 6.
- [x] Profil-Self-Service: `BankDetailsForm` beantragt jetzt statt sofort zu schreiben, neuer `MemberEmailChangeDialog` für die Vereinsmitglied-E-Mail.

**Test-Scope:** `invites.test.ts` (gebundene Pflicht, Verlängern/Widerrufen), `pending-changes.test.ts` (neu: Ersetzen offener Anträge, Ablehnen+Mail, Freigabe-Gate je `kind`).

---

## Paket 4 — Anonymisierung 3 Stufen + Jahreswechsel-Cron (#331, #332)

**Schicht:** `src/lib/members/anonymisation.ts` (aufteilen), neuer Cron-Endpunkt
**Abhängigkeit:** Paket 2 zwingend, **Paket 5 zwingend** (Stufe-2/3-Ausleih-Prüfung braucht `GameHolding.vereinsmitgliedId`), Paket 1 für #332 (Ausgetreten-Rolle nutzt Mehrfachrollen).

- [x] Bestehende `anonymiseMeepleRecord()` in drei Funktionen auftrennen (`src/lib/members/anonymisation.ts`):
  - **Stufe 1** (`anonymiseMeepleStufe1`): optionale `Meeple`-Felder + `Post.author` + Marktplatzbilder löschen, Displayname generisch, **kein** `anonymizedAt`, **keine** "ausgetreten"-Vorbedingung mehr — jederzeit selbst auslösbar.
  - **Stufe 2** (`anonymiseMeepleStufe2`): ruft Stufe 1 idempotent mit auf, löscht zusätzlich Neon-Auth-Login hart, trennt `Member.meepleId`, setzt `Meeple.anonymizedAt`.
  - **Stufe 3** (`anonymiseMemberStufe3`): `Member`-Zeile komplett löschen (12 Monate seit `membershipEndsAt` + keine offenen Ausleihen). **Schema-Korrektur nötig:** `GameHolding.vereinsmitgliedId` stand seit Paket 5 auf `onDelete: Restrict` — das hätte jede Stufe-3-Löschung mit historischen (abgeschlossenen) Aufenthalten blockiert. Migration `20260830190000_gameholding_member_setnull` stellt auf `SetNull` um (Historie bleibt lesbar, Personenbezug fällt weg — wie bei `Post.author`).
- [x] `admin-mitglieder/actions.ts::anonymiseMeeple` auf Stufe 1 + Stufe 2 umstellen; neue `deleteMemberPermanently` (Stufe 3), eigenes UI-Kärtchen "Bereit zur endgültigen Löschung" (Member-zentrisch, `listMembersEligibleForStufe3`, siehe Hinweis unten zu Meeple- vs. Member-zentrischen Listen).
- [x] Jahreswechsel-Cron (`src/lib/members/year-turn-cron.ts`, Endpunkt `/api/cron/year-turn`, `vercel.json` `0 2 2 1 *`) prüft in einem Lauf: (a) heuer `membershipEndsAt` erreicht + keine offenen Ausleihen → Stufe 2 automatisch, (b) vor 12 Monaten erreicht + keine offenen Ausleihen → Stufe 3 automatisch (`listMembersEligibleForStufe3`, gemeinsam mit der Admin-Übersicht genutzt).
- [x] Fälle mit offenen Ausleihen: Blockierte Fälle landen in der Rückgabe des Cron-Laufs + **eine** Sammel-Mail (Stufe 2/3 in getrennten Abschnitten) an alle Meeples mit `members:manage` **oder** `games:manage` (permission-, nicht rollenbasiert, `RolePermission`-Query). **Kein separates Admin-Dashboard-Widget** dafür gebaut (Zeitbudget) — die bestehende "Kündigungen mit offenen Beständen"-Karte auf `/admin/mitglieder` deckt Stufe-2-Fälle inhaltlich bereits ab, ein Stufe-3-Pendant fehlt noch (Paket 6 Kandidat).
- [x] **Ausgetreten-Rolle (#332):** neue `Role` "Ausgetreten" (`prisma/seed-roles.ts`, `AUSGETRETEN_PERMISSION_KEYS`) = voller Meeple-Katalog minus Ludothek-/interne-News-/Spielergesuch-Rechte. Zuweisung nur über `applyAusgetretenRole()` (`src/lib/auth/ausgetreten-role.ts`), ausschließlich vom Cron aufgerufen, kein UI-Pfad. Abweichung von der wörtlichen Plan-Vorgabe ("nur der Cron … entfernt"): `revokeResignation` ruft zusätzlich `removeAusgetretenRole()` auf — sonst bliebe ein widerrufener Austritt dauerhaft eingeschränkt.
- [x] Dashboard-Warnung bei Kündigung: bereits vorhanden (`resignationNotice` in `dashboard/page.tsx`/`dashboard-view.tsx`, zeigt Austrittsdatum + Anzahl offener Bestände) — nicht strikt auf die letzten 31 Tage begrenzt, deckt die Kernanforderung aber ab; kein weiterer UI-Feinschliff vorgenommen.
- [x] Permission-Gates fürs gesamte Portal — bereits durch Paket 1 abgedeckt (`ludothek:view`/`news:internal:view` gaten `/ludothek`, `/news`; `lfg:participate`/`market:participate` gaten die jeweiligen Server Actions), stichprobenartig verifiziert, keine weitere Arbeit nötig.

**Test-Scope:** `anonymisation.test.ts` (drei Stufen einzeln, Vorbedingungen), Cron-Handler-Test (offene-Ausleihen-Branch vs. Automatik-Branch, Sammel-Mail-Inhalt), `retention.test.ts` ggf. anpassen.

---

## Paket 5 — Ludothek: GameHolding referenziert Vereinsmitglied (#333)

**Schicht:** `src/lib/ludothek/` (bzw. bestehendes Aufenthalts-/Holding-Modul), `prisma/schema.prisma`
**Abhängigkeit:** Paket 2. **Muss vor Paket 4 fertig sein** (Issue-Vorgabe: #333 vor #331).
**Migration:** Teil derselben gemeinsamen Vereinsmitglied-Split-Migration wie Paket 2/3b:
- `GameHolding.meepleId` → `GameHolding.vereinsmitgliedId` (FK auf `Vereinsmitglied`), Datenmigration: jedes bisherige `meepleId` zeigt auf die begleitende `Vereinsmitglied`-Zeile aus Paket 2. `recordedByMeepleId` bleibt unverändert `Meeple`-Referenz.
- Neues dauerhaftes Sammelkonto-`Meeple` "Anonymer Meeple" (Seed-Ergänzung, kein Login, keine Vereinsmitglied-Referenz).

**Aufgaben:**
- [x] Zustand "ausgeliehen" bekommt Unterfälle **verfügbar** (haltendes Vereinsmitglied hat `meepleId`) / **nicht verfügbar** (keins) — Ableitung in der bestehenden Zustands-Funktion ergänzen.
- [x] Spielewart-Ansicht zeigt in beiden Fällen private Adresse/Telefon des haltenden Vereinsmitglieds.
- [x] Ausleihe/Rückgabe/Weitergabe-Aktionen auf `vereinsmitgliedId` umstellen.
- [x] **(a) "An extern ausgeben"** (`games:manage`): Ausleihe mit Ziel aus `Vereinsmitglied`-Tabelle statt `Meeple`-Tabelle.
- [x] **(b) "An extern weitergegeben"** (jedes Meeple): Freitextfeld Name, schließt eigenen Aufenthalt, öffnet neuen auf "Anonymer Meeple", kein Ablehnen-Pfad.
- [x] Spielewart-Ansicht zum manuellen Umbuchen vom Sammelkonto auf ein echtes `Vereinsmitglied`.
- [x] **(c)/(d)** einseitige "Ich habe das Spiel erhalten"-Bestätigung für Rückgabe von extern (Meeple bzw. Spielewart), kein Handshake.
- [x] Anonymisierte Alt-Meeples (`anonymizedAt` gesetzt) aus jedem Picker filtern; Suffix-Unterscheidung (`games:manage`) für Sammelkonto-Zeilen — bewusst ohne Nummerierung ("Anonymer Meeple #4"), siehe Abweichungs-Kommentar in `holding-actions-external.ts::scanListMembers`: es gibt genau ein dauerhaftes Sammelkonto.

**Test-Scope:** bestehende Holding-Tests auf `vereinsmitgliedId` umstellen (erledigt), neue Tests für verfügbar/nicht-verfügbar-Ableitung, Freitext-Weitergabe-Flow, Umbuchen-Flow, Picker-Filterung (erledigt).

---

## Paket 6 — UI: `/admin/mitglieder` neu strukturieren, Rollen-Feinschliff (#334, #215)

**Schicht:** `src/components/feature/admin-mitglieder/`
**Abhängigkeit:** Pakete 2, 3, 5 (braucht alle neuen Datenstrukturen/Prozesse als Grundlage). Letztes Paket — keine UI vor Abschluss der zugehörigen `lib`-Vorbedingungen.

- [ ] **Vereinsmitglieder-Akkordeon** (default offen): Mitgliedsnummer, voller Name, Beitrittsdatum, Austrittsdatum, Zustand, Beitragsart, Meeple-Link/Einladen-Button, Kündigung-vermerken/-widerrufen, Anonymisieren-Button (Stufe 1/2 je nach Zustand, Stufe-3-Button separat sobald Voraussetzungen erfüllt).
- [ ] **Meeple-Akkordeon** (default zu): Displayname, Rollen-Badges (Mehrfachrollen aus Paket 1), Status, Beigetreten am, Kündigung-vermerken-Button; darüber "Systemkonto anlegen"-Button.
- [ ] **Einladungen-Akkordeon** (default zu, `invites:manage`): bestehende Verlängern/Widerrufen-Ansicht bleibt, "Neues Mitglied einladen" entfällt (siehe Paket 3a).
- [ ] **Rollen-Akkordeon**: bereits vorhandene Dual-Listbox (#215, siehe "Bereits vorhandener Code") + neue Mehrfachauswahl-Zuweisung (#335/Paket 1) im selben Akkordeon zusammenführen — **hier nur UI-Konsistenz herstellen** (Badge-Darstellung, Dialog-Optik), kein Neubau der Dual-Listbox.
- [ ] Akkordeon-Header mit Datensatz-Anzahl-Badge (Muster ist an `RoleManagementSection` bereits vorhanden).
- [ ] Infocard "Aktive Mitglieder" mit Beitragsart-Unterteilung (Meeple/JungMeeple/MiniMeeple), Klick filtert Vereinsmitglieder-Tabelle.
- [ ] Infocards verlinken in passende Akkordeons, öffnen sie und setzen ggf. Filter.
- [ ] Such-/Filterfelder für alle Tabellen.

**Test-Scope:** Komponententests für neue/geänderte Akkordeon-Inhalte, Filter-Interaktion; Server-Action-Tests soweit hier noch neue Actions entstehen (meist schon in Paketen 2–5 abgedeckt).

---

## Reihenfolge-Zusammenfassung

```
Paket 1 (Permissions + Mehrfachrollen + Zeitfenster) ─┐
                                                        ├─→ Paket 4 (Anonymisierung + Ausgetreten-Rolle)
Paket 2 (Vereinsmitglied-Tabelle) ─┬─→ Paket 3 (Einladungen, Änderungsanträge) ─┐
                                    └─→ Paket 5 (GameHolding→Vereinsmitglied) ──┴─→ Paket 6 (UI)
```

Pakete 3 und 5 sind parallelisierbar (beide hängen nur an Paket 2), Paket 4 muss auf Paket 5 warten (nicht umgekehrt — Issue-Vorgabe "#333 vor #331"). Paket 6 ist immer letzt.

## Migrations-Zusammenfassung

- **Migration A** (Paket 1): `UserRole` → Mehrfachrollen-fähig (neue PK, `startsAt`/`endsAt`).
- **Migration B** (Pakete 2+3b+5, gemeinsam): `Vereinsmitglied`-Tabelle, `Meeple`-Feld-Wanderung, `PendingChange`-Tabelle, `GameHolding.meepleId → vereinsmitgliedId`, Datenmigration in einem Zug.

## Vor dem Push

`pnpm run verify` muss grün sein (format:check + typecheck + lint + test), Coverage-Schwelle 80 % auf `src/lib/**` und `**/actions.ts` einhalten. `docs/project-structure.md` und `CONTEXT.md` aktualisieren, falls neue geteilte Bausteine entstehen (z. B. `PendingChange`-Baustein, Beitragsart-Ableitung).

---
branch: feature/issue-batch-20260903
created: 2026-09-04
mode: autonomous (kein Stop-für-Review pro Issue — expliziter Nutzerwunsch, weicht von quick-sprint-Standard ab)
issues:
  320: { status: done }
  324: { status: blocked-commented }
  412: { status: done }
  339: { status: done-with-manual-followup }
  458: { status: done }
  465: { status: done }
  474: { status: done }
---

# Plan: 7 Ready-Issues im bestehenden Branch abarbeiten

Nutzer-Vorgabe: im bestehenden Feature-Branch arbeiten (kein neuer Branch),
Board-Spalten pflegen (In progress/In review), bei offenen Fragen
kommentieren + liegen lassen + weiter zum nächsten Issue. Kein Stopp für
Nutzer-Review nach jedem Issue (abweichend vom quick-sprint-Standard,
explizit vom Nutzer so gewünscht).

## Issue #320 — Blog-Beitrag ohne Titelbild: Vereinslogo statt generischem Placeholder in Übersicht
Bereits mit den heutigen Commits (placeholder-media.tsx) teilweise vorgearbeitet
(w-full/items-end). Fehlender Teil: `content-card.tsx` nutzt die Logo-Variante
noch nicht (nur `content-list-row.tsx` tut es bereits). Ziel 1 (Blog-Detail)
laut Issue bereits erledigt (`sizing="natural"`).

## Issue #324 — "Passwort vergessen"-Flow
Blocked by #323 (Brevo E-Mail-Versand produktiv verifizieren) — prüfen ob
#323 erledigt ist. Falls nicht: kommentieren, liegen lassen.

## Issue #412 — Profilbild an bestehenden Anzeigestellen integrieren
Blocked by #389 — ist "Done", also entsperrt. `MeepleAvatar` existiert
bereits und ist an mehreren Stellen integriert (lfg, contact-dialog, markt
via ContactDialog, explainer-badge-list, mitglieder-table,
erziehungsberechtigte/meine-kinder). Fehlende Stellen laut Audit:
guest-area-view.tsx (eigener <img>-Avatar statt MeepleAvatar — der
"Events"-Sichtbarkeitsfall aus der Issue-Beschreibung), holding-mini-dialogs
TargetPicker, bringbuy seller-dashboard-view, admin-events
(shift-plan-editor/helper-pool-bar/assigned-block), admin-einheiten
assign-keeper-dialog, erklaerbaeren-view/explainer-directory prüfen.

## Issue #339 — Globale System-Notification (Banner + Glocke)
Großes Feature: neues Prisma-Modell, neues Recht `notifications:manage`,
CRUD-Seite, Banner in AppShell, Glocke im Header, localStorage-Handling,
Datenschutz-Ergänzung. Kein Blocker, keine offene Frage laut Issue-Text.

## Issue #458 — Event anlegen: Datumsbereich/Weiterleitung
Laut Kommentaren bereits umgesetzt (ae65132), aber Folge-Kommentar meldet
Bug: Redirect nutzt `result.slug`, Route ist aber `/admin/events/[id]`.
Fix: `router.push(`/admin/events/${result.id}`)`.

## Issue #465 — Meeple-QR-Code per Longpress im Header
Neuer `use-long-press`-Hook, QR-Popup, `resolveScannedCode` neue Variante
`kind: "meeple"`, Sofort-Bestätigung bei QR-Scan-Herkunft.

## Issue #474 — Offene Stammdaten-Änderungen in /admin/mitglieder
Klar umrissener Fix: fehlender Filter + zweites PendingChangesPanel.

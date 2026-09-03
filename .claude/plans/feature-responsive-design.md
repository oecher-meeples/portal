---
branch: feature/responsive-design
created: 2026-09-03
issues:
  437: { status: pending }
  336: { status: pending }
  430: { status: pending }
  426: { status: pending }
---

# Plan: Responsive Design Batch (Epic #278)

## Issue #437 — Mobile Navigation: Bottom-Bar mit Bottom-Sheets pro Nav-Gruppe

- Neue Bottom-Bar-Komponente für `< sm` mit 3 Gruppen-Icons (Haus/Meeple/Gears), analog zu den 3 Sidebar-Gruppen aus `nav-config.ts`.
- Leere Gruppen (0 sichtbare Einträge für aktuellen Nutzer) werden ausgeblendet — gleiche `minTier`/`permission`/`requiresFlag`-Logik wie Desktop-Sidebar, kein Parallelregelwerk.
- Bottom-Sheet pro Icon über `@base-ui/react/dialog` (wie `dialog.tsx`), von unten statt zentriert.
- Aktiv-Status-Hervorhebung des Icons der aktuellen Seiten-Gruppe (gleicher Hintergrund wie Desktop-Aktiv-Item).
- Einbindung in `app-shell.tsx`/Layout, sichtbar nur `< sm`.
- Datei-Layer: `components/layout/` (Rahmenbaustein, analog `sidebar.tsx`).

## Issue #336 — Sidebar auf md-Displays: Icon-only-Breite, Hover-Overlay statt volle Breite

- `sidebar.tsx`: Breakpoint-Logik — `< md` ausgeblendet (unverändert), `md`–`lg` icon-only, ab `xl` volle Breite dauerhaft.
- Hover/Fokus klappt auf volle Breite als `absolute`-Overlay (höherer z-index) auf, ohne Content-Breite zu verschieben.
- Pin/Toggle-Button, Zustand in `localStorage` persistiert (client-seitig, kein Server-State).
- Gruppentrennung im Icon-only-Zustand als dünne Linie ohne Titel/Pfeil.
- Aktiver Menüpunkt behält Hervorhebungshintergrund auch im Icon-only-Zustand.
- `app-shell.tsx`: `sm:ml-64`-Margin anpassen (schmalere Margin für `md`–`lg` Icon-only-Breite, volle Margin erst ab `xl`), darf sich beim Hover-Overlay nicht ändern.
- Betrifft nicht `nav-config.ts` (Inhalt) oder `header.tsx`.

## Issue #430 — Profilseite: Bankverbindungs-Karte läuft auf schmalen Bildschirmen über

- `bankverbindung-section.tsx:89-105`: Header-Zeile (Titel + "Bearbeiten"-Button) auf `flex-wrap` umstellen statt reinem `justify-between` ohne Wrap.
- Restliche Karte auf weitere Overflow-Stellen prüfen.

## Issue #426 — Ludothek-Filterpanel: responsives Layout statt starrer Einzelspalte

- `ludothek-filter-panel.tsx:185`: von starrer `flex flex-col`/`max-w-xs`-Struktur auf responsives Grid/Flex-Wrap umstellen, das verfügbaren Platz nutzt.

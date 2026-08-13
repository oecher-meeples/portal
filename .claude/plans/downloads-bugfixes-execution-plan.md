# Execution Plan: Downloads-Seite Bugfixes (`/downloads`)

Erstellt: 2026-08-13 · Branch: `feature/downloads-unified-view`

## Vorab-Befund (Code bereits geprüft)

Punkte 1–3 aus dem Bug-Report sind im aktuellen Code **bereits korrekt implementiert**:

- `listVisibleDownloads(tier)` ([src/lib/downloads/downloads.ts:7-14](src/lib/downloads/downloads.ts#L7)) filtert PUBLIC/INTERNAL/OFFLINE korrekt nach Tier.
- Drag-Handle ([download-row.tsx:105-110](src/components/feature/downloads/download-row.tsx#L105)) und Aktion-Dropdown ([download-row.tsx:128-166](src/components/feature/downloads/download-row.tsx#L128)) sind bereits hinter `canManage` versteckt.
- `canManage` kommt server-seitig aus `hasPermission(user.id, "downloads:manage")` ([page.tsx:37-38](src/app/downloads/page.tsx#L37)) — die echte Rechteprüfung.

→ Vor Schritt 1: mit einem **echten Gast-/Mitglieds-Account** (nicht Admin) gegenprüfen, ob das Problem reproduzierbar ist. Falls ja, liegt es vermutlich an folgendem echten Bug, der trotzdem behoben werden sollte:

- **Bug:** `page.tsx` übergibt `getSessionTier()` an `listVisibleDownloads()`. `getSessionTier()` ist laut eigenem Docstring aber die **Preview-Tier für Anzeigezwecke** ("real access control never calls this", [session.ts:61-66](src/lib/auth/session.ts#L61)) — sie liefert bei einem Admin je nach Preview-Cookie eine andere Tier als die reale Rolle. Für die tatsächliche Sichtbarkeitsfilterung der Dateien ist das falsch.

---

## Schritt 1 — `getSessionTier`-Missbrauch für Sichtbarkeitsfilter beheben

**Datei:** [src/app/downloads/page.tsx](src/app/downloads/page.tsx)

- `listVisibleDownloads(tier)` mit `getRealSessionTier()` statt `getSessionTier()` aufrufen (echte Rolle, nicht Preview).
- `getSessionTier()` bleibt für die Legal-Doc-Sichtbarkeit unangetastet, falls dort ebenfalls Preview gewünscht ist (aktuell keine Filterung dort, siehe Schritt 3).
- **DoD:** Als Admin mit `preview-tier=gast`-Cookie: `/downloads` zeigt weiterhin alle PUBLIC+INTERNAL Dateien (weil Admin real ist), nicht nur PUBLIC.
- Commit: `fix(downloads): use real session tier for visibility filtering, not preview tier`

## Schritt 2 — Meeple-Icon-Komponente vereinheitlichen (Punkt 5)

Aktuell zwei Implementierungen mit unterschiedlichem Bild/Text:
- `src/components/entities/download-internal-badge.tsx` — `/meeple.png`, Kreis-Badge, Tooltip "Nur für Mitglieder"
- `src/components/feature/admin-news/admin-news-view.tsx:86-96` — inline `Image` mit `/meeple-150x150.png`, Tooltip "Nur intern sichtbar"

Vorgabe: **admin/news-Variante als Referenz** verwenden (Icon + Tooltip), als eigene Komponente extrahieren, an beiden Stellen einsetzen.

- Neue Komponente `src/components/entities/internal-only-badge.tsx`:
  ```tsx
  export function InternalOnlyBadge({ tooltip = "Nur intern sichtbar" }: { tooltip?: string }) {
    return (
      <Tooltip content={tooltip}>
        <Image src="/meeple-150x150.png" alt={tooltip} width={16} height={16} className="size-4 shrink-0" />
      </Tooltip>
    );
  }
  ```
- `admin-news-view.tsx:86-96` auf `<InternalOnlyBadge />` umstellen (DRY, 2. Vorkommen).
- `download-internal-badge.tsx` löschen, `download-row.tsx:119` auf `{file.status === "INTERNAL" && <InternalOnlyBadge tooltip="Nur für Mitglieder" />}` umstellen.
- **DoD:** Beide Seiten zeigen dasselbe Icon (`/meeple-150x150.png`) mit passendem Tooltip-Text; kein doppelter Code mehr.
- Commit: `refactor(ui): extract shared InternalOnlyBadge, reuse in downloads + admin-news`

## Schritt 3 — Legal-Dokumente: Upload-Zugang von `/downloads` aus (Punkt 8)

`/admin/legal` hat bereits vollen PDF-Upload + Sections-Editor ([legal-document-editor.tsx](src/components/feature/admin-legal/legal-document-editor.tsx)) — nur fehlt auf `/downloads` selbst jeder Hinweis/Zugang dafür. Aktuell zeigt der rechte Block in [downloads-view.tsx:114-130](src/components/feature/downloads/downloads-view.tsx#L114) nur "Ansehen →"-Links, unabhängig von Rechten.

- `page.tsx`: zusätzlich `hasPermission(user.id, "legal:manage")` prüfen → `canManageLegal`-Prop an `DownloadsView`.
- `downloads-view.tsx`: wenn `canManageLegal`, neben "Ansehen →" einen zweiten `<Button variant="outline" size="sm" render={<Link href="/admin/legal">Verwalten</Link>}>` pro Zeile rendern (verlinkt auf den bestehenden Editor — kein neuer Editor nötig, nur Sichtbarkeit/Zugang von der Downloads-Seite aus).
- **DoD:** Meeple mit `legal:manage` sieht auf `/downloads` einen "Verwalten"-Link zu jedem Legal-Dokument; ohne Recht nur "Ansehen →".
- Commit: `feat(downloads): surface legal document management entry point for legal:manage`

## Schritt 4 — Download-Button-Icon (Punkt 4)

**Datei:** [download-row.tsx:167-175](src/components/feature/downloads/download-row.tsx#L167)

```tsx
import { Download } from "lucide-react";
...
<Button variant="outline" size="sm" render={<a href={file.fileUrl} download><Download />Download</a>} />
```

- **DoD:** Jeder Download-Button zeigt das lucide `Download`-Icon vor dem Text.
- Commit: `feat(downloads): add icon to download button`

## Schritt 5 — Upload-Button-Outline (Punkt 6)

**Datei:** [download-upload-form.tsx:79-81](src/components/feature/downloads/download-upload-form.tsx#L79)

- Aktuell `variant="default"` (transparente Border, siehe [button.tsx:11](src/components/ui/button.tsx#L11)) — dadurch im `bg-muted/30`-Container schwer erkennbar.
- Fix: `<Button type="submit" variant="outline" disabled={!canSubmit}>` — konsistent mit dem Muster in `legal-document-editor.tsx` ("Section hinzufügen" nutzt ebenfalls `variant="outline"`).
- **DoD:** Upload-Button hat sichtbaren Rahmen, hebt sich vom Hintergrund ab.
- Commit: `fix(downloads): give upload button a visible outline`

## Schritt 6 — Dateityp-Beschränkung entfernen (Punkt 7)

Betrifft 3 Stellen, client- und serverseitig:

- **Client-Hinweistext + `accept`:**
  - [download-upload-form.tsx:70-75](src/components/feature/downloads/download-upload-form.tsx#L70): Label `"Datei (PDF oder XLSX)"` → `"Datei"`; `accept="application/pdf,.xlsx"` entfernen.
  - [download-row.tsx:182](src/components/feature/downloads/download-row.tsx#L182): `accept`-Attribut am Reupload-Input entfernen.
- **`FILE_TYPE_BY_MIME`-Mapping** (beide Dateien, [download-upload-form.tsx:13-16](src/components/feature/downloads/download-upload-form.tsx#L13) & [download-row.tsx:35-38](src/components/feature/downloads/download-row.tsx#L35)): aktuell bricht der Upload/Reupload für jeden nicht gelisteten Mime-Typ stillschweigend ab (`if (!fileType) return;`). Fallback ergänzen: `FILE_TYPE_BY_MIME[file.type] ?? file.name.split(".").pop()?.toUpperCase() ?? "DATEI"`, damit beliebige Dateitypen einen sinnvollen Typ-Label bekommen statt den Upload klammheimlich zu verwerfen.
- **Server-seitiges Allow-List** in [actions.ts:14-17](src/lib/downloads/actions.ts#L14) (`ALLOWED_CONTENT_TYPES`) und deren Verwendung in `getDownloadUploadToken` ([actions.ts:141-146](src/lib/downloads/actions.ts#L141)): `allowedContentTypes`-Option entfernen (Vercel Blob lässt dann jeden Content-Type zu). `MAX_UPLOAD_BYTES` (20 MB) bleibt als sinnvolle Größenbeschränkung erhalten.
- **Icon-Fallback** in `download-row.tsx:111-115` (XLSX → `FileSpreadsheet`, sonst `FileText`) bleibt unverändert — funktioniert als generischer Fallback für jeden anderen Dateityp bereits korrekt.
- **DoD:** Beliebiger Dateityp lässt sich hochladen/reuploaden, kein Abbruch, sinnvolles Typ-Label; Tests in `src/lib/downloads/actions.test.ts` ggf. anpassen, falls sie `allowedContentTypes` prüfen.
- Commit: `feat(downloads): remove file type restriction on upload/reupload`

---

## Reihenfolge & Verifikation

1. Schritt 1 (Sicherheits-relevanter Fix zuerst)
2. Schritt 6 (Datenmodell-nahe Änderung, vor UI-Polish)
3. Schritte 2, 3, 4, 5 (UI, unabhängig voneinander, können parallel erledigt werden)

Nach jedem Schritt: `pnpm run verify`. Abschließend manuell auf `localhost:3002/downloads` mit drei Accounts prüfen: Gast (nicht eingeloggt), Mitglied ohne Rechte, Admin/Meeple mit `downloads:manage` + `legal:manage`.

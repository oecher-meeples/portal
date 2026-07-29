# Instagram-Anbindung: Setup-Checkliste

Das Instagram-Cross-Posting (siehe `docs/roadmap.md`, Phase 3) ist vollständig implementiert und getestet, aber ohne echte Meta-App-Zugangsdaten inaktiv. Vor dem produktiven Einsatz müssen folgende, außerhalb dieses Repos liegenden Schritte einmalig erledigt werden:

- [ ] **1. Instagram-Business-Account anlegen** und mit einer Facebook-Seite des Vereins verknüpfen ([Anleitung](https://help.instagram.com/502981923235522)).
- [ ] **2. Meta-App erstellen** im [Meta Developer Portal](https://developers.facebook.com/apps), Produkt **„Instagram Graph API"** hinzufügen.
- [ ] **3. App-Review beantragen** für die Berechtigungen `instagram_content_publish`, `pages_show_list` und `instagram_basic`, und genehmigt bekommen (Meta prüft dies manuell, kann mehrere Tage dauern).
- [ ] **4. Umgebungsvariablen eintragen** — lokal in `.env.local`, produktiv in den Vercel-Projekt-Umgebungsvariablen (siehe `.env.example` für alle Werte):
  - `META_APP_ID`, `META_APP_SECRET` (aus dem Meta-App-Dashboard, App-Einstellungen → Basis)
  - `META_REDIRECT_URI` (muss exakt einer im Meta-App als Instagram-Produkt registrierten Redirect-URI entsprechen, z. B. `https://<domain>/api/auth/instagram/callback`)
  - `META_GRAPH_API_VERSION` (aktuelle stabile Version, z. B. `v21.0`)
  - `CRON_SECRET` (beliebiges zufälliges Secret, schützt den täglichen Cron-Endpoint)
  - `PUBLIC_SITE_URL` (öffentliche Domain, wird im Instagram-Caption-Text als Link-Hinweis verwendet)
- [ ] **5. OAuth-Connect-Flow einmalig durchlaufen**: Im Admin-Bereich unter „Einstellungen → Instagram" (`/admin/einstellungen/instagram`) mit einem Account der Rolle `admin` einloggen und auf „Mit Instagram verbinden" klicken.

Danach übernimmt der tägliche Vercel-Cron-Job (`vercel.json`, `/api/cron/instagram-queue`) automatisch das Cross-Posting freigegebener Beiträge sowie den Token-Refresh.

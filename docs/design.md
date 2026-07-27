# Design & Theming

> Dokumentiert die Farb- und Theme-Entscheidungen für die Oecher Meeples Vereinswebseite. Baut auf den Technologie-Entscheidungen aus [setup.md](setup.md) auf (Tailwind CSS v4, shadcn/ui).

---

## Markenfarben

| Rolle          | Farbe                          | Hex       |
|----------------|---------------------------------|-----------|
| Primärfarbe    | Oecher Gelb                    | `#FFDE00` |
| Sekundärfarbe  | Schwarz                        | `#000000` |

Diese beiden Farben bilden die Basis der Marke und werden in beiden Modi (Light/Dark) als Akzent- bzw. Kontrastfarbe verwendet — nicht als vollflächiger Hintergrund, um ausreichenden Kontrast und Lesbarkeit zu gewährleisten (WCAG AA).

---

## Light- & Dark-Mode

- Beide Modi werden unterstützt.
- **Default:** richtet sich nach der Systemeinstellung des Nutzers (`prefers-color-scheme`), kein erzwungener Default.
- Manuelles Umschalten bleibt möglich (Theme-Toggle im Header), die Auswahl wird lokal gespeichert und überschreibt den System-Default.

### Umsetzung

- **`next-themes`** für Theme-Verwaltung in Next.js (App Router-kompatibel, verhindert Flash-of-wrong-theme via `suppressHydrationWarning`).
  ```bash
  pnpm add next-themes
  ```
- `attribute="class"`, `defaultTheme="system"`, `enableSystem` im `ThemeProvider`.
- Tailwind v4: Dark-Mode-Variante über `@custom-variant dark (&:where(.dark, .dark *));` in `globals.css`, da Tailwind v4 CSS-first konfiguriert wird (keine `tailwind.config.js`-Option mehr nötig).

---

## Farbtokens (CSS-Variablen)

Analog zum shadcn/ui-Token-System (`--background`, `--foreground`, `--primary`, …), definiert in `globals.css`:

```css
:root {
  --background: #ffffff;
  --foreground: #000000;

  --primary: #FFDE00;
  --primary-foreground: #000000;

  --secondary: #000000;
  --secondary-foreground: #ffffff;

  --accent: #FFDE00;
  --accent-foreground: #000000;

  --border: #e5e5e5;
  --ring: #FFDE00;
}

.dark {
  --background: #000000;
  --foreground: #ffffff;

  --primary: #FFDE00;
  --primary-foreground: #000000;

  --secondary: #ffffff;
  --secondary-foreground: #000000;

  --accent: #FFDE00;
  --accent-foreground: #000000;

  --border: #262626;
  --ring: #FFDE00;
}
```

`#FFDE00` bleibt in beiden Modi als Primär-/Akzentfarbe identisch — nur Hintergrund/Vordergrund tauschen zwischen Schwarz und Weiß.

---

## shadcn/ui-Integration

Beim Setup (`pnpm dlx shadcn@latest init`, siehe [setup.md](setup.md#5-shadcnui-einrichten)):

- **Base color:** `Neutral` (Grau-Skala für Border/Muted-Töne), Primärfarbe wird anschließend manuell auf `#FFDE00` überschrieben.
- **CSS variables:** `Yes`, damit die obigen Tokens greifen.

---

## Referenzen

- [next-themes](https://github.com/pacocoursey/next-themes)
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)

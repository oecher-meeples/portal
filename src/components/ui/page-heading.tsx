import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  media,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optionales Element links neben Eyebrow+Titel (z. B. ein Profilbild) —
   * vertikal zentriert neben diesem Block, unabhängig von `description`
   * darunter. Fachfrei: nur ein Slot, kein Bild-Wissen hier. Eigene feste
   * Größe bringt der Aufrufer mit (kein `items-stretch` hier — bei einem
   * `<img>` mit `aspect-square` ist das Stretch/Aspect-Ratio-Zusammenspiel
   * über Browser hinweg unzuverlässig und kann größer als der Textblock
   * werden). */
  media?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        {media}
        <div className="flex flex-col gap-2">
          <p className="text-primary text-xs font-semibold tracking-wider uppercase">
            {eyebrow}
          </p>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            {action}
          </div>
        </div>
      </div>
      {description && (
        <p className="text-muted-foreground max-w-2xl">{description}</p>
      )}
    </div>
  );
}

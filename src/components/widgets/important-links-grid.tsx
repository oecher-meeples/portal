import { cardVariants } from "@/components/ui/card";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CoverMedia } from "@/components/ui/cover-media";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";
import { cn } from "@/lib/utils/cn";

export type LinkGridItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  iconUrl?: string;
  /** Opens in a new tab via a plain anchor instead of `next/link` — for links leaving the portal. */
  external?: boolean;
};

/**
 * Raster der Link-Kacheln, geteilt mit `ImportantLinksEditor`. #454: ab `sm`
 * feste 200-px-Spalten (`minmax(200px,200px)` statt `1fr`), damit wenige
 * Einträge nicht auf volle Container-Breite auseinandergezogen werden;
 * `auto-fit` füllt so viele Spalten wie möglich. #584: auf `< sm` genau zwei
 * Kacheln pro Zeile.
 */
export const LINK_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(200px,200px))] sm:gap-4";

/** #584: weniger Innenabstand auf `< sm`, damit zwei Kacheln nebeneinander
 * passen. */
export const LINK_TILE_CLASS = "max-sm:p-3";

/** #584: Label schrumpft auf `< sm` fließend (Untergrenze 11 px, #581) statt
 * abgeschnitten zu werden; Umbruch zwischen Wörtern, `break-word` nur als
 * letzte Notbremse. */
export const LINK_TILE_LABEL_CLASS =
  "min-w-0 max-w-full font-serif font-semibold wrap-break-word max-sm:text-[clamp(0.6875rem,3.3vw,1rem)]";

/** Shared card grid for Schnellzugriff and the admin-curated Wichtige Links (#110) — same layout, either a Lucide icon or an uploaded image. */
export function ImportantLinksGrid({ items }: { items: LinkGridItem[] }) {
  return (
    <div className={LINK_GRID_CLASS}>
      {items.map((item) => {
        const content = (
          <>
            {item.icon ? (
              <item.icon className="text-primary size-6" />
            ) : (
              <CoverMedia
                sizes="32px"
                imageUrl={item.iconUrl}
                alt=""
                aspect="aspect-square"
                className="w-8"
              />
            )}
            <span className={LINK_TILE_LABEL_CLASS}>{item.label}</span>
          </>
        );
        const className = cn(
          cardVariants({ layout: "tile" }),
          LINK_TILE_CLASS,
          CARD_HOVER_CLASS,
        );

        return item.external ? (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className={className}
          >
            {content}
          </a>
        ) : (
          <Link key={item.href} href={item.href} className={className}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}

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

/** Shared card grid for Schnellzugriff and the admin-curated Wichtige Links (#110) — same layout, either a Lucide icon or an uploaded image. */
export function ImportantLinksGrid({ items }: { items: LinkGridItem[] }) {
  return (
    // #454: minmax(200px,200px) statt minmax(200px,1fr) — feste statt
    // gestreckte Kartenbreite, damit wenige Einträge nicht auf volle
    // Container-Breite auseinandergezogen werden. auto-fit sorgt weiterhin
    // dafür, dass so viele 200px-Spalten wie möglich in eine Reihe passen.
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,200px))] gap-4">
      {items.map((item) => {
        const content = (
          <>
            {item.icon ? (
              <item.icon className="text-primary size-6" />
            ) : (
              <CoverMedia
                imageUrl={item.iconUrl}
                alt=""
                aspect="aspect-square"
                className="w-8"
              />
            )}
            <span className="font-serif font-semibold">{item.label}</span>
          </>
        );
        const className = cn(
          "bg-card flex flex-col items-center gap-2 rounded-lg border p-6 text-center",
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

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CoverMedia } from "@/components/ui/cover-media";

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        const className =
          "bg-card hover:border-primary/60 flex flex-col items-center gap-2 rounded-lg border p-6 text-center transition-colors";

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

import type * as React from "react";
import { Card, cardVariants } from "@/components/ui/card";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";

/** Große Kennzahl einer Kachel (#581): auf `< sm` max. 26 px statt
 * `text-3xl`, ab `sm` unverändert. */
export function StatValue({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "mt-2 font-serif text-[1.625rem] font-bold sm:text-3xl",
        className,
      )}
      {...props}
    />
  );
}

function StatTileContent({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <>
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {label}
      </p>
      <StatValue>{value}</StatValue>
      {hint && <p className="text-muted-foreground mt-1 text-sm">{hint}</p>}
    </>
  );
}

/** Pass `href` to make the tile a link to where that number comes from
 * (e.g. a dashboard stat → the filtered list behind it, #224-Folge). */
export function StatTile({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(cardVariants(), "block h-full", CARD_HOVER_CLASS)}
      >
        <StatTileContent label={label} value={value} hint={hint} />
      </Link>
    );
  }

  return (
    <Card className="block">
      <StatTileContent label={label} value={value} hint={hint} />
    </Card>
  );
}

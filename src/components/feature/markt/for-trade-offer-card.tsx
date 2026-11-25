"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CoverMedia } from "@/components/ui/cover-media";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";
import { MeepleContactDialog } from "@/components/widgets/contact/meeple-contact-dialog";
import { cn } from "@/lib/utils/cn";
import type { ForTradeGame } from "@/lib/markt/for-trade-offers";

/** Ein zum Tausch angebotener Titel (#632-Folge): Titelbild, Titel als Link
 * zur Spieleseite (neuer Tab) und die anbietenden Personen mit Kontakt-Dialog,
 * die zugeklappt bleiben, bis man das Bild oder den Pfeil anklickt. Kein
 * `Accordion`, weil der Titel ein eigener Link ist — ein Link im
 * Akkordeon-Trigger (Button) wäre verschachtelt-interaktiv. */
export function ForTradeOfferCard({ game }: { game: ForTradeGame }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen((current) => !current);
  const label = open ? "Personen ausblenden" : "Personen anzeigen";

  return (
    <Card size="sm" className="self-start">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`${game.title}: ${label}`}
          className="shrink-0 rounded-md"
        >
          <CoverMedia
            imageUrl={game.imageUrl}
            alt=""
            aspect="aspect-square"
            sizes="64px"
            className="size-16 rounded-md"
          />
        </button>
        <Link
          href={`/ludothek/${game.boardGameSlug}`}
          target="_blank"
          rel="noreferrer"
          className="hover:text-primary flex min-w-0 flex-1 items-center gap-1 font-medium underline-offset-2 hover:underline"
        >
          <span className="truncate">{game.title}</span>
          <ExternalLink className="size-3.5 shrink-0" />
        </Link>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-label={`${game.title}: ${label}`}
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-md"
        >
          <ChevronDown
            className={cn("size-5 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>
      {open && (
        <ul className="flex flex-col gap-2">
          {game.owners.map((owner) => (
            <li
              key={owner.meepleId}
              className="flex min-w-0 items-center gap-2"
            >
              <MeepleAvatar
                name={owner.name}
                profilePictureUrl={owner.profilePictureUrl}
                profilePictureVisibility={owner.profilePictureVisibility}
                viewer={{ kind: "meeple" }}
                size="sm"
              />
              <MeepleContactDialog
                name={owner.name}
                meepleId={owner.meepleId}
                className="min-w-0 truncate text-left"
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

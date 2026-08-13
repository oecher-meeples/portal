"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { ContactLinks } from "@/lib/members/contact";

/**
 * A person's name as a link — click opens a dialog with every contact
 * option (Mail/Telegram) at once, instead of a row of icon links per place
 * that shows a person (market listings, ludothek standort, …).
 */
export function ContactDialog({
  name,
  contact,
  className,
}: {
  name: string;
  contact: ContactLinks;
  className?: string;
}) {
  if (!contact.mailHref && !contact.telegramHref) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "hover:text-primary underline-offset-2 hover:underline",
              className,
            )}
          >
            {name}
          </button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{name} kontaktieren</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {contact.mailHref && (
            <Button
              className="gap-1.5"
              render={<a href={contact.mailHref}>✉️ E-Mail</a>}
            />
          )}
          {contact.telegramHref && (
            <Button
              variant="outline"
              className="gap-1.5"
              render={
                <a href={contact.telegramHref} target="_blank" rel="noreferrer">
                  Telegram
                </a>
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

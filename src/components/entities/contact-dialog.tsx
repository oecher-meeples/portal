"use client";

import { MapPinIcon, MessageCircleIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
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
  if (
    !contact.mailHref &&
    !contact.telegramHref &&
    !contact.signalHref &&
    !contact.discordHandle &&
    !contact.address
  ) {
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
          {contact.signalHref && (
            <Button
              variant="outline"
              className="gap-1.5"
              render={
                <a href={contact.signalHref} target="_blank" rel="noreferrer">
                  Signal
                </a>
              }
            />
          )}
          {contact.discordHandle && (
            <CopyButton
              value={contact.discordHandle}
              label={`Discord: ${contact.discordHandle}`}
              icon={MessageCircleIcon}
            />
          )}
          {contact.address && (
            <div className="border-input flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
              <p className="whitespace-pre-line">{contact.address}</p>
              <CopyButton
                value={contact.address}
                label="Kopieren"
                icon={MapPinIcon}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

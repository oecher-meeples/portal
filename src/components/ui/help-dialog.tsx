import type { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** Fragezeichen-Button neben einer Überschrift, öffnet ein Erklär-Popup
 * (#453) — fachfrei, der eigentliche Erklärtext kommt vom Aufrufer als
 * `children`. Wiederverwendbar für jede Karte, die eine kurze Einordnung
 * braucht, ohne den Platz einer permanenten Beschreibung zu belegen. */
export function HelpDialog({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Erklärung: ${title}`}
          />
        }
      >
        <HelpCircle className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-sm">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

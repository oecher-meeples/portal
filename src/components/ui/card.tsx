import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

/**
 * Einheitliche Card des Portals (Portalstil: `rounded-lg`, `border`, `p-5`).
 * `size="sm"` für kompakte Fälle (`p-4`), `size="flush"` für Hüllen ohne
 * Innenabstand, deren Kinder ihr eigenes Padding mitbringen (z. B.
 * `divide-y`-Listen, Tabellen), `variant="destructive"` für
 * Warn-/Gefahren-Cards (roter Rand, deckender Hintergrund).
 *
 * Abstände zwischen den Kindern regelt `gap-3`; wer eine andere Lücke
 * braucht, überschreibt per `className` (z. B. `gap-4`).
 *
 * Muss die Hülle ein anderes Element sein (`<Link>`, `<form>`, `<li>`,
 * Accordion-Root), liefert `cardVariants({ … })` dieselben Klassen — nie die
 * Hüllen-Klassen von Hand kopieren.
 */
const cardVariants = cva(
  "group/card bg-card text-card-foreground flex flex-col gap-3 rounded-lg border",
  {
    variants: {
      size: {
        default: "p-5",
        sm: "p-4",
        flush: "gap-0 overflow-hidden p-0",
      },
      variant: {
        default: "",
        destructive: "border-destructive/50",
      },
      /** Zentrierte Kachel (Icon + Label), z. B. Schnellzugriff. */
      layout: {
        stack: "",
        tile: "items-center gap-2 text-center",
      },
    },
    defaultVariants: { size: "default", variant: "default", layout: "stack" },
  },
);

type CardVariantProps = VariantProps<typeof cardVariants>;

function Card({
  className,
  size = "default",
  variant = "default",
  layout = "stack",
  ...props
}: React.ComponentProps<"div"> & CardVariantProps) {
  return (
    <div
      data-slot="card"
      data-size={size}
      data-variant={variant}
      className={cn(cardVariants({ size, variant, layout }), className)}
      {...props}
    />
  );
}

/**
 * Kopf einer Card: Titel + Beschreibung links, `CardAction` rechts. Ist die
 * Card schmaler als `@md` (28 rem), rutschen die Aktionen unter Titel und
 * Beschreibung. Der äußere Wrapper ist der Container, das innere Grid
 * reagiert darauf (ein Container kann sich nicht selbst abfragen).
 */
function CardHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("@container/card-header min-w-0", className)}
      {...props}
    >
      <div className="grid auto-rows-min items-start gap-x-4 gap-y-1 has-data-[slot=card-action]:gap-y-2 @md/card-header:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] @md/card-header:has-data-[slot=card-action]:gap-y-1">
        {children}
      </div>
    </div>
  );
}

function CardTitle({
  className,
  as: Comp = "h2",
  ...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
  return (
    <Comp
      data-slot="card-title"
      className={cn(
        "font-serif text-lg leading-snug font-bold wrap-break-word group-data-[size=sm]/card:text-base",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "flex flex-wrap items-center gap-2 justify-self-start @md/card-header:col-start-2 @md/card-header:row-span-2 @md/card-header:row-start-1 @md/card-header:self-start @md/card-header:justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn(className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-2 border-t pt-3", className)}
      {...props}
    />
  );
}

export {
  Card,
  cardVariants,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};

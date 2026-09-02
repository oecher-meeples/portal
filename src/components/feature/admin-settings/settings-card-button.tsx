import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";
import { CARD_HOVER_CLASS } from "@/components/ui/card-hover";

/** Button-Variante von `SettingsCard` — für Karten in /admin/einstellungen,
 * die einen Popup-Dialog statt eine eigene Route öffnen (als `render`-Prop
 * von `DialogTrigger`, das Click-Handler/ref auf dieses Element klont —
 * deshalb `forwardRef` + Props-Spread statt eines fixen Props-Interfaces).
 * Braucht `cursor-pointer` explizit, weil Tailwinds Preflight
 * `cursor: default` auf `<button>` setzt — sonst sieht die Karte trotz
 * Hover-Effekt nicht klickbar aus. */
export const SettingsCardButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    title: string;
    description: string;
    badge?: {
      count: number;
      variant?: VariantProps<typeof badgeVariants>["variant"];
    };
    /** Label-Badge neben dem Titel — analog `SettingsCard`s `status`-Prop,
     * für Verbindungszustände statt Zählern (z. B. "Verbunden"). */
    status?: {
      label: string;
      variant?: VariantProps<typeof badgeVariants>["variant"];
    };
  }
>(function SettingsCardButton(
  { title, description, badge, status, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn("group w-full cursor-pointer text-left", className)}
      {...props}
    >
      <Card className={CARD_HOVER_CLASS}>
        {badge && (
          <Badge
            variant={badge.variant ?? "default"}
            className="absolute top-1/2 right-4 h-7 min-w-7 -translate-y-1/2 px-2.5 text-sm"
          >
            {badge.count}
          </Badge>
        )}
        <CardHeader className={badge ? "pr-14" : undefined}>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{title}</CardTitle>
            {status && (
              <Badge variant={status.variant ?? "secondary"}>
                {status.label}
              </Badge>
            )}
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </button>
  );
});

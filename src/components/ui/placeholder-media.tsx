import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function PlaceholderMedia({
  label = "BILD",
  className,
  aspect = "aspect-video",
  variant = "generic",
}: {
  label?: string;
  className?: string;
  aspect?: string;
  /** "logo" (#320): für redaktionelle Übersichten (Kachel-Grid,
   * Listenzeile) — zeigt statt der gestrichelten Box mit BILD-Icon das
   * Vereinslogo, `w-fit`/zentriert statt auf `aspect` gestreckt. Bewusst nur
   * an den beiden News/Blog-Übersichtsstellen gesetzt (`content-card.tsx`,
   * `content-list-row.tsx`) — alle anderen `CoverMedia`-Nutzer (Marktplatz,
   * Ludothek, Dashboard) behalten die generische Variante als Standard. */
  variant?: "generic" | "logo";
}) {
  if (variant === "logo") {
    return (
      <div
        className={cn(
          "bg-muted flex items-center justify-center overflow-hidden rounded-md border",
          aspect,
          className,
        )}
      >
        <Image
          src="/icons/Logo-Oecher-Meeples.png"
          alt=""
          width={3840}
          height={1000}
          className="h-auto w-1/2 object-contain dark:hidden"
        />
        <Image
          src="/icons/oecher-meeples-header-dark.png"
          alt=""
          width={3840}
          height={1000}
          className="hidden h-auto w-1/2 object-contain dark:block"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-md border border-dashed bg-[repeating-linear-gradient(135deg,transparent,transparent_10px,var(--border)_10px,var(--border)_11px)]",
        aspect,
        className,
      )}
    >
      <span className="bg-background/80 text-muted-foreground flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium tracking-wide uppercase">
        <ImageIcon className="size-3.5" />
        {label}
      </span>
    </div>
  );
}

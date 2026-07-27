import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlaceholderMedia({
  label = "BILD",
  className,
  aspect = "aspect-video",
}: {
  label?: string;
  className?: string;
  aspect?: string;
}) {
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

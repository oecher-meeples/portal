import { PlaceholderMedia } from "@/components/ui/placeholder-media";
import { cn } from "@/lib/utils/cn";

/** Game cover image, falling back to the placeholder when no imageUrl is set. */
export function GameCoverMedia({
  imageUrl,
  title,
  className,
  aspect = "aspect-[3/4]",
}: {
  imageUrl: string | null;
  title: string;
  className?: string;
  aspect?: string;
}) {
  if (!imageUrl) {
    return (
      <PlaceholderMedia label="COVER" aspect={aspect} className={className} />
    );
  }

  return (
    <div
      className={cn(
        "bg-muted overflow-hidden rounded-md border",
        aspect,
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- covers come from arbitrary external BGG/user URLs, not next/image-optimizable local assets */}
      <img
        src={imageUrl}
        alt={title}
        className="size-full object-contain"
      />
    </div>
  );
}

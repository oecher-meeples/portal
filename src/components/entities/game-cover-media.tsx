import { CoverMedia } from "@/components/ui/cover-media";

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
  return (
    <CoverMedia
      imageUrl={imageUrl}
      alt={title}
      label="COVER"
      aspect={aspect}
      className={className}
      fit="contain"
    />
  );
}

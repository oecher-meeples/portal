import { getYoutubeEmbedUrl } from "@/lib/utils/youtube";

/** Renders the game's Erklärvideo as an embedded YouTube player, falling back to a link. */
export function ExplainerVideo({ url }: { url: string }) {
  const embedUrl = getYoutubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary text-sm underline underline-offset-3"
      >
        Erklärvideo ansehen
      </a>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border">
      <iframe
        src={embedUrl}
        title="Erklärvideo"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

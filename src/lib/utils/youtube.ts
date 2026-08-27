/**
 * Public YouTube search for a game's rules explainer video (#261) — no BGG
 * data or API quota involved, so it's safe to expose to unauthenticated
 * guests. `language` picks the search-term suffix ("Regeln" vs. "rules");
 * the game-detail page offers one button per language.
 */
export function buildYoutubeRulesSearchUrl(
  title: string,
  language: "de" | "en",
): string {
  const suffix = language === "de" ? "Regeln" : "rules";
  const query = `${title} ${suffix}`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/** Turns a youtube.com/youtu.be watch URL into an embeddable player URL, or null if unrecognised. */
export function getYoutubeEmbedUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }

  if (host === "youtube.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (parsed.pathname.startsWith("/embed/")) {
      return parsed.toString();
    }
  }

  return null;
}

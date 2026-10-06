import type { BggExplainerVideo, BggItem, BggVideoEntry } from "./client";
import { toArray } from "./xml-helpers";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);

function isYoutubeLink(link: string): boolean {
  try {
    const url = new URL(link);
    return url.protocol === "https:" && YOUTUBE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Alle instruktiven YouTube-Videos im gelieferten Videofenster, deren Sprache
 * `predicate` erfüllt (#185). BEKANNTE GRENZE: der `thing`-Endpunkt liefert im
 * `videos`-Block nur ein festes Fenster der ~15 aktuellsten Videos, auch wenn
 * `<videos total>` mehr meldet — ein existierendes Video außerhalb dieses
 * Fensters wird nicht gefunden. Das ist eine BGG-API-Einschränkung, keine
 * Regression: die Website selbst filtert Sprache nur clientseitig/serverseitig
 * auf einer eigenen, nicht über die XML-API erreichbaren Route.
 */
function selectExplainerVideosByLanguage(
  videos: BggItem["videos"],
  predicate: (language: string | undefined) => boolean,
): BggExplainerVideo[] {
  return toArray(videos?.video)
    .filter(
      (video): video is BggVideoEntry & { link: string } =>
        video.category === "instructional" &&
        predicate(video.language) &&
        video.link !== undefined &&
        isYoutubeLink(video.link),
    )
    .map((video) => ({
      title: video.title ?? "",
      url: video.link,
      channel: video.username ?? "",
    }));
}

export function selectGermanExplainerVideos(
  videos: BggItem["videos"],
): BggExplainerVideo[] {
  return selectExplainerVideosByLanguage(
    videos,
    (language) => language === "German",
  );
}

/** Videos ohne Sprachangabe gelten als Englisch — BGG setzt das Attribut nur
 * für nicht-englische Videos, viele ältere/englische Einträge tragen daher
 * gar kein `language`-Attribut (#185-Folgeanfrage). */
export function selectEnglishExplainerVideos(
  videos: BggItem["videos"],
): BggExplainerVideo[] {
  return selectExplainerVideosByLanguage(
    videos,
    (language) => language === undefined || language === "English",
  );
}

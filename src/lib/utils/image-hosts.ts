/**
 * Welche Bild-Origins der Next-Image-Optimizer verarbeiten darf (#521) —
 * gemeinsam genutzt von `next.config.ts` (`images.remotePatterns`) und
 * `CoverMedia` (alles andere wird `unoptimized` ausgeliefert, statt am
 * Optimizer mit 400 zu scheitern).
 *
 * Bewusst ohne Server-Abhängigkeiten: `next.config.ts` importiert das.
 */

/** BoardGameGeek liefert die Cover (`image` = `__original`-Datei). */
export const BGG_IMAGE_ORIGIN = "https://cf.geekdo-images.com";

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/;

/**
 * Optimierbare Origins: BGG plus der öffentliche S3-Endpoint, sofern gesetzt.
 * Ein lokaler/privater S3-Host (Dev: `http://localhost:8333`) bleibt draußen
 * — den würde der Optimizer ohne `dangerouslyAllowLocalIP` ohnehin abweisen.
 * Wird beim `next build` ausgewertet: ohne `S3_PUBLIC_ENDPOINT` zur Build-
 * Zeit laufen Uploads unoptimiert (siehe docs/deployment-docker.md).
 */
export function optimizedImageOrigins(
  s3PublicEndpoint: string | undefined = process.env.S3_PUBLIC_ENDPOINT,
): string[] {
  const origins = [BGG_IMAGE_ORIGIN];
  if (!s3PublicEndpoint) return origins;
  try {
    const url = new URL(s3PublicEndpoint);
    if (!PRIVATE_HOST.test(url.hostname)) origins.push(url.origin);
  } catch {
    // Ungültiger Wert: lieber unoptimiert als ein kaputtes Pattern.
  }
  return origins;
}

/** Ob `src` von einem optimierbaren Origin stammt. */
export function isOptimizableImageUrl(
  src: string,
  origins: readonly string[],
): boolean {
  try {
    return origins.includes(new URL(src).origin);
  } catch {
    return false;
  }
}

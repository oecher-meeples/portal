import { prisma } from "@/lib/utils/prisma";

/**
 * Schreibseite des In-App-Trackings (Ersatz für Vercel Web Analytics,
 * Docker-Migration Phase 5). Die Beacon-Route `/api/analytics/collect` ist
 * öffentlich und unauthentifiziert — deshalb wird hier jedes Feld defensiv
 * geprüft und auf das Nötigste reduziert. Gespeichert werden nie IP-Adresse,
 * roher User-Agent oder Query-Strings (können Tokens enthalten, z. B. beim
 * Passwort-Reset).
 */

/** Obergrenze (Zeichen) für den rohen Request-Body — echtes Payload ~100. */
export const MAX_BODY_LENGTH = 2048;
export const MAX_PATH_LENGTH = 512;
const MAX_REFERRER_HOST_LENGTH = 253; // max. DNS-Namenslänge

/**
 * Erlaubte Zeichen eines URL-Pfads (RFC 3986 `pchar` + `/`), Prozent-Escapes
 * inklusive. Alles andere (Leerzeichen, `<`, `"`, Steuerzeichen, `?`, `#`)
 * fliegt raus — es ist dann kein Pfad, den der Client legitim schickt.
 */
const PATH_PATTERN = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*$/;

/** Kein Tracking interner/technischer Pfade (sollten vom Client nie kommen). */
const IGNORED_PATH_PREFIXES = ["/api/", "/_next/"];

export function sanitizePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (value.length === 0 || value.length > MAX_PATH_LENGTH) return null;
  // "//host" wäre eine protokoll-relative URL, kein Pfad.
  if (value.startsWith("//")) return null;
  if (!PATH_PATTERN.test(value)) return null;
  if (IGNORED_PATH_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return null;
  }
  // Trailing Slash normalisieren, damit "/news" und "/news/" eine Zeile sind.
  return value.length > 1 && value.endsWith("/") ? value.slice(0, -1) : value;
}

/**
 * Reduziert einen Referrer auf den Host einer *externen* Seite. Eigene Seite
 * (`ownHost`), Nicht-HTTP(S)-URLs und Unparsbares ergeben `null` — Pfad und
 * Query der Herkunftsseite werden nie gespeichert.
 */
export function sanitizeReferrer(
  value: unknown,
  ownHost: string | null,
): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.length > 2 * MAX_PATH_LENGTH) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host.length === 0 || host.length > MAX_REFERRER_HOST_LENGTH) return null;
  const normalizedOwnHost = ownHost
    ?.toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/^www\./, "");
  if (normalizedOwnHost && host === normalizedOwnHost) return null;
  return host;
}

/** Geräteklassen (Anzeige-Label = gespeicherter Wert). */
export const DEVICE = {
  desktop: "Desktop",
  mobile: "Mobil",
  tablet: "Tablet",
} as const;

export type ClientCategory = { browser: string; device: string };

const BOT_PATTERN =
  /bot|crawl|spider|slurp|headless|lighthouse|preview|curl|wget|python|java\/|go-http|node-fetch|axios/i;

/** Reihenfolge zählt: Edge/Opera/Samsung tragen auch "Chrome" im UA. */
const BROWSER_RULES: [RegExp, string][] = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

/**
 * Grobe Kategorie aus dem User-Agent — der rohe String wird danach verworfen.
 * `null` für Bots/Crawler/Skripte und fehlenden UA: die zählen nicht als
 * Besuch.
 */
export function categorizeUserAgent(
  userAgent: string | null,
): ClientCategory | null {
  if (!userAgent || BOT_PATTERN.test(userAgent)) return null;

  const browser =
    BROWSER_RULES.find(([pattern]) => pattern.test(userAgent))?.[1] ?? "Andere";

  let device: string = DEVICE.desktop;
  if (/iPad|Tablet|PlayBook|Silk/.test(userAgent)) {
    device = DEVICE.tablet;
  } else if (/Android/.test(userAgent) && !/Mobile/.test(userAgent)) {
    device = DEVICE.tablet;
  } else if (/Mobi|iPhone|iPod|Android/.test(userAgent)) {
    device = DEVICE.mobile;
  }

  return { browser, device };
}

export type PageViewInput = {
  path: string;
  referrer: string | null;
  browser: string;
  device: string;
};

/**
 * Prüft den rohen Beacon-Body. Gibt `null` zurück, wenn er verworfen werden
 * soll (ungültig, zu groß, Bot) — der Aufrufer antwortet dann trotzdem
 * neutral, damit Clients nichts über die Prüfung lernen.
 */
export function parsePageViewBeacon({
  body,
  userAgent,
  host,
}: {
  body: string;
  userAgent: string | null;
  host: string | null;
}): PageViewInput | null {
  if (body.length === 0 || body.length > MAX_BODY_LENGTH) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return null;
  }
  if (typeof payload !== "object" || payload === null) return null;
  const { path, referrer } = payload as Record<string, unknown>;

  const sanitizedPath = sanitizePath(path);
  if (!sanitizedPath) return null;

  const category = categorizeUserAgent(userAgent);
  if (!category) return null;

  return {
    path: sanitizedPath,
    referrer: sanitizeReferrer(referrer, host),
    ...category,
  };
}

/**
 * Liest den Body höchstens bis `MAX_BODY_LENGTH` (+1) — ein falscher oder
 * fehlender `Content-Length` (chunked) kann so keinen großen Body in den
 * Speicher zwingen. `null` = zu groß.
 */
export async function readBeaconBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BODY_LENGTH) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    if (text.length > MAX_BODY_LENGTH) {
      await reader.cancel();
      return null;
    }
  }
  return text + decoder.decode();
}

/** Beacon von einer fremden Seite (Browser setzt `Sec-Fetch-Site`). */
export function isCrossSiteRequest(headers: Headers): boolean {
  return headers.get("sec-fetch-site") === "cross-site";
}

/**
 * Respektiert "Do Not Track" bzw. Global Privacy Control — obwohl ohnehin
 * nichts Personenbezogenes gespeichert wird.
 */
export function visitorOptedOut(headers: Headers): boolean {
  return headers.get("dnt") === "1" || headers.get("sec-gpc") === "1";
}

export async function recordPageView(input: PageViewInput) {
  await prisma.pageView.create({ data: input });
}

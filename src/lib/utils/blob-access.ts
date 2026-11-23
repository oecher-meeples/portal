import { createHash, createHmac } from "node:crypto";
import { requireEnv } from "@/lib/utils/require-env";
import {
  getS3Bucket,
  keyFromPublicUrl,
  publicUrlForKey,
  publicBlobEndpoint,
  s3Region,
} from "@/lib/utils/blob-url";

// Bewusst ohne `import "server-only"`: die Prisma-Extension läuft auch in
// Seed-Skripten. `node:crypto` und das nicht-öffentliche `S3_SECRET_KEY`
// halten das Modul trotzdem aus jedem Client-Bundle heraus.

/**
 * Wer welche Datei im Blob-Speicher ohne Signatur lesen darf (#112).
 *
 * **Deny by default:** Nur diese Präfixe sind anonym lesbar — die
 * `seaweedfs-init`-Bucket-Policy (docker-compose.yml) gibt genau sie frei.
 * Alles andere (Downloads, Markt-, LFG-, Profil- und Link-Bilder, jedes
 * künftige Präfix) gibt es nur über eine kurzlebige signierte URL.
 *
 * Ändert sich diese Liste, muss die Policy in docker-compose.yml mit.
 */
export const PUBLIC_BLOB_PREFIXES = ["instagram-covers", "legal"] as const;

/** Gültigkeit einer signierten GET-URL. Eine Stunde reicht für einen
 * Seitenbesuch samt Nachladen; danach ist ein geleakter Link wertlos. */
export const SIGNED_BLOB_URL_TTL_SECONDS = 60 * 60;

/** `true` für Keys unter einem öffentlichen Präfix (`legal/…`). */
export function isPublicBlobKey(key: string): boolean {
  return PUBLIC_BLOB_PREFIXES.some((prefix) => key.startsWith(`${prefix}/`));
}

function isAbsoluteUrl(value: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Normalisiert einen gespeicherten Verweis auf einen Objekt-Key: ein Key
 * bleibt ein Key, eine URL in unserem Bucket wird zum Key. `null` für alles,
 * was nicht in unserem Bucket liegt — fremde URLs (Alt-URLs von Vercel Blob,
 * BGG-Hotlinks) und App-Pfade mit führendem `/` (statische Dateien aus
 * `public/`, z. B. die Demo-Downloads). Da gibt es nichts zu signieren oder
 * zu löschen.
 */
export function blobKeyFrom(stored: string): string | null {
  const value = stored.trim();
  if (!value || value.startsWith("/")) return null;
  if (isAbsoluteUrl(value)) return keyFromPublicUrl(value);
  return value;
}

/**
 * Was eine Action für einen vom Client übergebenen Dateiverweis speichert
 * (#112): Unsere URL (auch signiert — die Signatur fällt weg) oder ein Key
 * wird zum Key, muss dann aber unter `prefix` liegen. Sonst könnte jemand
 * einen fremden Key (`downloads/…`) in sein Inserat schreiben und bekäme
 * dafür eine signierte URL — die Signatur ersetzte dann die Berechtigung.
 *
 * Fremde URLs und App-Pfade bleiben unverändert (Alt-Daten, z. B. BGG- oder
 * Vercel-Bilder in alten Inseraten): dafür signiert die App nichts, sie
 * öffnen also keinen Zugriff.
 */
export function toStoredBlobRef(value: string, prefix: string): string {
  const key = blobKeyFrom(value);
  if (key === null) return value.trim();
  if (!key.startsWith(`${prefix}/`) || key.split("/").includes("..")) {
    throw new Error("Ungültiger Dateiverweis.");
  }
  return key;
}

/**
 * Anzeige-URL für einen gespeicherten Verweis. Öffentliche Präfixe bekommen
 * die dauerhafte URL, private eine signierte GET-URL mit
 * `SIGNED_BLOB_URL_TTL_SECONDS`, fremde URLs bleiben unverändert.
 *
 * Synchron, weil die Prisma-Result-Extension (`lib/utils/prisma.ts`) sie
 * beim Lesen aufruft — die Lesestellen selbst sind bereits gegated, die
 * Signatur prüft nichts mehr, sie begrenzt nur die Lebensdauer des Links.
 */
export function signedBlobUrl(stored: string, now = new Date()): string {
  const key = blobKeyFrom(stored);
  if (key === null) return stored;
  if (isPublicBlobKey(key)) return publicUrlForKey(key);
  return presignGetUrl(key, now);
}

/** `signedBlobUrl` für optionale Felder (`null` bleibt `null`). */
export function signedBlobUrlOrNull(
  stored: string | null | undefined,
): string | null {
  return stored ? signedBlobUrl(stored) : null;
}

/** RFC-3986-Kodierung wie AWS sie für SigV4 verlangt — strenger als
 * `encodeURIComponent` (`!'()*` werden ebenfalls kodiert). */
function awsEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function hmac(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * Presigned GET (AWS Signature V4, Query-Parameter-Variante) für einen
 * Objekt-Key — dieselbe URL, die `@aws-sdk/s3-request-presigner` liefert
 * (der Test vergleicht beide), aber synchron. Path-Style gegen den
 * Browser-Endpunkt, weil der Host in die Signatur eingeht.
 */
function presignGetUrl(key: string, now: Date): string {
  const endpoint = new URL(publicBlobEndpoint());
  const region = s3Region();
  const accessKey = requireEnv("S3_ACCESS_KEY");
  const secretKey = requireEnv("S3_SECRET_KEY");

  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const basePath = endpoint.pathname.replace(/\/+$/, "");
  const path = `${basePath}/${getS3Bucket()}/${key.split("/").map(awsEncode).join("/")}`;

  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Amz-Credential": `${accessKey}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(SIGNED_BLOB_URL_TTL_SECONDS),
    "X-Amz-SignedHeaders": "host",
    "x-id": "GetObject",
  };
  const query = Object.keys(params)
    .sort()
    .map((name) => `${awsEncode(name)}=${awsEncode(params[name])}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    path,
    query,
    `host:${endpoint.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    createHash("sha256").update(canonicalRequest, "utf8").digest("hex"),
  ].join("\n");

  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), "s3"),
    "aws4_request",
  );
  const signature = hmac(signingKey, stringToSign).toString("hex");

  return `${endpoint.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

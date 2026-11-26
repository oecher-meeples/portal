/**
 * Lässt für Redirect-Ziele aus Query-Parametern nur interne Pfade zu
 * (`/foo?bar`). Absolute URLs, protokoll-relative (`//host`) und
 * Backslash-Varianten (`/\host`, die Browser wie `//` behandeln) fallen auf
 * den Fallback zurück — sonst wäre `?next=https://evil.example` ein offener
 * Redirect.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/login",
): string {
  if (!value || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}

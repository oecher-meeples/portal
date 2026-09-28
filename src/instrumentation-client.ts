// crypto.randomUUID() is only defined in secure contexts (https, or the
// literal hostname "localhost"). Accessing the dev server via a LAN IP or
// any other non-"localhost" host over http therefore leaves it undefined,
// which crashes "@neondatabase/auth" at import time. Polyfill it from
// crypto.getRandomValues(), which is available in insecure contexts too.
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  crypto.randomUUID = (() => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }) as Crypto["randomUUID"];
}

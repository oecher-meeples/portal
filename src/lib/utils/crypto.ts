import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = "v1";

export class EncryptionKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EncryptionKeyError";
  }
}

export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecryptionError";
  }
}

function readKey() {
  const raw = process.env.MEMBER_DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new EncryptionKeyError(
      "MEMBER_DATA_ENCRYPTION_KEY ist nicht gesetzt. Schlüssel mit `openssl rand -base64 32` erzeugen und außerhalb von Vercel sichern.",
    );
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new EncryptionKeyError(
      `MEMBER_DATA_ENCRYPTION_KEY muss base64-kodierte ${KEY_BYTES} Byte enthalten, gefunden: ${key.length}.`,
    );
  }

  return key;
}

export function encryptSecret(plaintext: string) {
  const key = readKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return [
    VERSION,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string) {
  const key = readKey();
  const parts = payload.split(":");
  if (parts.length !== 4) {
    throw new DecryptionError("Ungültiges Format des verschlüsselten Werts.");
  }

  const [version, ivB64, tagB64, ciphertextB64] = parts;
  if (version !== VERSION) {
    throw new DecryptionError(
      `Unbekannter Versionspräfix "${version}" — dieser Wert wurde mit einem anderen Verfahren verschlüsselt.`,
    );
  }

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== IV_BYTES || tag.length !== 16) {
    throw new DecryptionError("Ungültiger IV oder Auth-Tag.");
  }

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new DecryptionError(
      "Der verschlüsselte Wert konnte nicht entschlüsselt werden (falscher Schlüssel oder manipulierte Nutzlast).",
    );
  }
}

const IBAN_LENGTHS_BY_COUNTRY: Record<string, number> = {
  AT: 20,
  BE: 16,
  CH: 21,
  CZ: 24,
  DE: 22,
  DK: 18,
  ES: 24,
  FI: 18,
  FR: 27,
  GB: 22,
  IT: 27,
  LI: 21,
  LU: 20,
  NL: 18,
  PL: 28,
  PT: 25,
  SE: 24,
};

/** Uppercase, without spaces, dashes or other separators. */
export function normaliseIban(raw: string) {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** ISO 13616 structure plus the mod-97 checksum. No external dependency. */
export function isValidIban(raw: string) {
  const iban = normaliseIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;

  const expectedLength = IBAN_LENGTHS_BY_COUNTRY[iban.slice(0, 2)];
  if (expectedLength && iban.length !== expectedLength) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (char) =>
    String(char.charCodeAt(0) - 55),
  );

  let remainder = 0;
  for (const digit of digits) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
}

/** The last four characters, stored in clear text so lists render without decrypting. */
export function ibanLast4(raw: string) {
  return normaliseIban(raw).slice(-4);
}

/** The first two characters (ISO country code), stored in clear text — not
 * sensitive on its own, used by `maskIban()` for a full-length mask
 * (Live-Review F6). */
export function ibanFirst2(raw: string) {
  return normaliseIban(raw).slice(0, 2);
}

/** Fallback when no full IBAN length is known for a country prefix — the
 * most common length in `IBAN_LENGTHS_BY_COUNTRY` (DE). */
const DEFAULT_IBAN_LENGTH = 22;

/**
 * Display form for lists and forms (Live-Review F6): with `first2` a
 * full-length mask like "DE****************2051" (country prefix + stars up
 * to the real IBAN length + last four digits). Without `first2` (records
 * from before this field existed) falls back to the short "**** 1234" form
 * — no forced backfill needed.
 */
export function maskIban(
  first2: string | null | undefined,
  last4: string | null | undefined,
) {
  if (!last4) return "—";
  if (!first2) return `**** ${last4}`;

  const totalLength = IBAN_LENGTHS_BY_COUNTRY[first2] ?? DEFAULT_IBAN_LENGTH;
  const starCount = Math.max(totalLength - first2.length - last4.length, 0);
  return `${first2}${"*".repeat(starCount)}${last4}`;
}

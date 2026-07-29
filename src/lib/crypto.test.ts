import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DecryptionError,
  EncryptionKeyError,
  decryptSecret,
  encryptSecret,
  ibanLast4,
  isValidIban,
  maskIban,
  normaliseIban,
} from "./crypto";

const TEST_KEY = Buffer.alloc(32, 7).toString("base64");
const IBAN = "DE89 3704 0044 0532 0130 00";

describe("encryptSecret / decryptSecret", () => {
  beforeEach(() => {
    process.env.MEMBER_DATA_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    delete process.env.MEMBER_DATA_ENCRYPTION_KEY;
  });

  it("round-trips a value", () => {
    const payload = encryptSecret("DE89370400440532013000");

    expect(decryptSecret(payload)).toBe("DE89370400440532013000");
  });

  it("produces different ciphertexts for the same plaintext (random iv)", () => {
    const first = encryptSecret("same-value");
    const second = encryptSecret("same-value");

    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("same-value");
    expect(decryptSecret(second)).toBe("same-value");
  });

  it("prefixes the payload with the format version", () => {
    expect(encryptSecret("x").startsWith("v1:")).toBe(true);
  });

  it("throws a speaking error when the key is missing", () => {
    delete process.env.MEMBER_DATA_ENCRYPTION_KEY;

    expect(() => encryptSecret("x")).toThrow(EncryptionKeyError);
    expect(() => encryptSecret("x")).toThrow(/MEMBER_DATA_ENCRYPTION_KEY/);
  });

  it("throws when the key is too short", () => {
    process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString(
      "base64",
    );

    expect(() => encryptSecret("x")).toThrow(/32 Byte/);
  });

  it("throws when the auth tag was tampered with", () => {
    const [version, iv, , ciphertext] = encryptSecret("x").split(":");
    const forgedTag = Buffer.alloc(16, 0).toString("base64");

    expect(() =>
      decryptSecret([version, iv, forgedTag, ciphertext].join(":")),
    ).toThrow(DecryptionError);
  });

  it("throws when the ciphertext was tampered with", () => {
    const parts = encryptSecret("original value").split(":");
    parts[3] = Buffer.from("tampered value").toString("base64");

    expect(() => decryptSecret(parts.join(":"))).toThrow(DecryptionError);
  });

  it("throws on an unknown version prefix instead of guessing", () => {
    const parts = encryptSecret("x").split(":");
    parts[0] = "v2";

    expect(() => decryptSecret(parts.join(":"))).toThrow(/Versionspräfix/);
  });

  it("throws on a malformed payload", () => {
    expect(() => decryptSecret("not-a-payload")).toThrow(
      /Ungültiges Format/,
    );
  });

  it("throws when decrypting with a different key", () => {
    const payload = encryptSecret("secret");
    process.env.MEMBER_DATA_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString(
      "base64",
    );

    expect(() => decryptSecret(payload)).toThrow(DecryptionError);
  });
});

describe("normaliseIban", () => {
  it("strips spaces and dashes and uppercases", () => {
    expect(normaliseIban("de89 3704-0044 0532 0130 00")).toBe(
      "DE89370400440532013000",
    );
  });
});

describe("isValidIban", () => {
  it("accepts a valid german iban with and without spaces", () => {
    expect(isValidIban(IBAN)).toBe(true);
    expect(isValidIban("DE89370400440532013000")).toBe(true);
  });

  it("accepts a valid iban from another sepa country", () => {
    expect(isValidIban("AT611904300234573201")).toBe(true);
  });

  it("rejects a wrong checksum", () => {
    expect(isValidIban("DE88370400440532013000")).toBe(false);
  });

  it("rejects a wrong length for the country", () => {
    expect(isValidIban("DE8937040044053201300")).toBe(false);
  });

  it("rejects nonsense input", () => {
    expect(isValidIban("")).toBe(false);
    expect(isValidIban("hallo welt")).toBe(false);
    expect(isValidIban("1234567890123456789012")).toBe(false);
  });
});

describe("ibanLast4 / maskIban", () => {
  it("returns the last four characters of the normalised iban", () => {
    expect(ibanLast4(IBAN)).toBe("3000");
  });

  it("masks everything but the last four digits", () => {
    expect(maskIban(ibanLast4(IBAN))).toBe("**** 3000");
  });

  it("renders a dash when nothing is stored", () => {
    expect(maskIban(null)).toBe("—");
    expect(maskIban(undefined)).toBe("—");
    expect(maskIban("")).toBe("—");
  });
});

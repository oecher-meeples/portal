import { describe, expect, it } from "vitest";
import { getContactLinks } from "./contact";

describe("getContactLinks", () => {
  it("returns both links when email and telegram handle are set", () => {
    expect(
      getContactLinks({ email: "lea@example.com", telegramHandle: "lea_tg" }),
    ).toEqual({
      mailHref: "mailto:lea@example.com",
      telegramHref: "https://t.me/lea_tg",
    });
  });

  it("returns only the mail link when no telegram handle is set", () => {
    expect(
      getContactLinks({ email: "lea@example.com", telegramHandle: null }),
    ).toEqual({
      mailHref: "mailto:lea@example.com",
      telegramHref: null,
    });
  });

  it("returns both null when neither is set", () => {
    expect(getContactLinks({ email: null, telegramHandle: null })).toEqual({
      mailHref: null,
      telegramHref: null,
    });
  });

  it("builds a correct t.me link from an already-normalised handle", () => {
    expect(getContactLinks({ email: null, telegramHandle: "lea_tg" })).toEqual({
      mailHref: null,
      telegramHref: "https://t.me/lea_tg",
    });
  });
});

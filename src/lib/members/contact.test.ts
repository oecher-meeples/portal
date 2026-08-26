import { describe, expect, it } from "vitest";
import { getContactLinks } from "./contact";

const NONE = {
  email: null,
  telegramHandle: null,
  signalHandle: null,
  discordHandle: null,
  address: null,
  shareAddress: false,
};

describe("getContactLinks", () => {
  it("returns all links when every handle is set and the address is shared", () => {
    expect(
      getContactLinks({
        email: "lea@example.com",
        telegramHandle: "lea_tg",
        signalHandle: "lea_signal",
        discordHandle: "lea#discord",
        address: "Musterstr. 1, 52062 Aachen",
        shareAddress: true,
      }),
    ).toEqual({
      mailHref: "mailto:lea@example.com",
      telegramHref: "https://t.me/lea_tg",
      signalHref: "https://signal.me/#eu/lea_signal",
      discordHandle: "lea#discord",
      address: "Musterstr. 1, 52062 Aachen",
    });
  });

  it("returns only the mail link when nothing else is set", () => {
    expect(getContactLinks({ ...NONE, email: "lea@example.com" })).toEqual({
      mailHref: "mailto:lea@example.com",
      telegramHref: null,
      signalHref: null,
      discordHandle: null,
      address: null,
    });
  });

  it("returns all null when nothing is set", () => {
    expect(getContactLinks(NONE)).toEqual({
      mailHref: null,
      telegramHref: null,
      signalHref: null,
      discordHandle: null,
      address: null,
    });
  });

  it("builds a correct t.me link from an already-normalised telegram handle", () => {
    expect(getContactLinks({ ...NONE, telegramHandle: "lea_tg" })).toEqual({
      mailHref: null,
      telegramHref: "https://t.me/lea_tg",
      signalHref: null,
      discordHandle: null,
      address: null,
    });
  });

  it("builds a correct signal.me link from an already-normalised signal handle", () => {
    expect(getContactLinks({ ...NONE, signalHandle: "lea_signal" })).toEqual({
      mailHref: null,
      telegramHref: null,
      signalHref: "https://signal.me/#eu/lea_signal",
      discordHandle: null,
      address: null,
    });
  });

  it("passes the discord handle through unchanged — no reliable deep link exists for it", () => {
    expect(getContactLinks({ ...NONE, discordHandle: "lea#discord" })).toEqual({
      mailHref: null,
      telegramHref: null,
      signalHref: null,
      discordHandle: "lea#discord",
      address: null,
    });
  });

  it("hides the address when set but not shared (default)", () => {
    expect(
      getContactLinks({
        ...NONE,
        address: "Musterstr. 1, 52062 Aachen",
        shareAddress: false,
      }),
    ).toEqual({
      mailHref: null,
      telegramHref: null,
      signalHref: null,
      discordHandle: null,
      address: null,
    });
  });

  it("shows the address once shareAddress is opted in", () => {
    expect(
      getContactLinks({
        ...NONE,
        address: "Musterstr. 1, 52062 Aachen",
        shareAddress: true,
      }),
    ).toEqual({
      mailHref: null,
      telegramHref: null,
      signalHref: null,
      discordHandle: null,
      address: "Musterstr. 1, 52062 Aachen",
    });
  });
});

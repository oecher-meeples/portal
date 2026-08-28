import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const { registerExternalSeller, findExternalSellerByToken } =
  await import("./external-sellers");

function event(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "event-1",
    title: "Frühjahrstreffen",
    hasBringAndBuyMarket: true,
    startsAt: new Date(),
    endsAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  sendTransactionalEmailMock.mockReset();
  sendTransactionalEmailMock.mockResolvedValue(undefined);
  prismaMock.event.findUnique.mockResolvedValue(event() as never);
  prismaMock.fleaMarketExternalSeller.create.mockResolvedValue({} as never);
});

describe("registerExternalSeller", () => {
  it("rejects missing fields", async () => {
    const result = await registerExternalSeller({
      eventId: "event-1",
      name: "",
      handle: "",
      email: "",
    });

    expect(result).toEqual({
      error: "Bitte Name, Kürzel und E-Mail-Adresse angeben.",
    });
    expect(prismaMock.fleaMarketExternalSeller.create).not.toHaveBeenCalled();
  });

  it("rejects an event without an open Bring & Buy market", async () => {
    prismaMock.event.findUnique.mockResolvedValue(
      event({ hasBringAndBuyMarket: false }) as never,
    );

    const result = await registerExternalSeller({
      eventId: "event-1",
      name: "Anna",
      handle: "AN",
      email: "anna@example.com",
    });

    expect(result.error).toBeTruthy();
    expect(prismaMock.fleaMarketExternalSeller.create).not.toHaveBeenCalled();
  });

  it("creates the seller and emails the personal link", async () => {
    const result = await registerExternalSeller({
      eventId: "event-1",
      name: "Anna",
      handle: "AN",
      email: "Anna@Example.com",
    });

    expect(result).toEqual({ success: true });
    expect(prismaMock.fleaMarketExternalSeller.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventId: "event-1",
        name: "Anna",
        handle: "AN",
        email: "anna@example.com",
        token: expect.any(String),
      }),
    });
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "anna@example.com" }),
    );
  });
});

describe("findExternalSellerByToken", () => {
  it("returns null for an unknown token", async () => {
    prismaMock.fleaMarketExternalSeller.findUnique.mockResolvedValue(null);

    expect(await findExternalSellerByToken("nope")).toBeNull();
  });

  it("returns the seller context for a still-valid token", async () => {
    prismaMock.fleaMarketExternalSeller.findUnique.mockResolvedValue({
      id: "seller-1",
      eventId: "event-1",
      name: "Anna",
      items: [{ status: "SOLD" }],
    } as never);

    expect(await findExternalSellerByToken("tok")).toEqual({
      id: "seller-1",
      eventId: "event-1",
      name: "Anna",
    });
  });

  it("returns null once every item reached a terminal state", async () => {
    prismaMock.fleaMarketExternalSeller.findUnique.mockResolvedValue({
      id: "seller-1",
      eventId: "event-1",
      name: "Anna",
      items: [{ status: "PAID_OUT" }],
    } as never);

    expect(await findExternalSellerByToken("tok")).toBeNull();
  });
});

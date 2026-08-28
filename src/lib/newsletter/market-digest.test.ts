import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const sendTransactionalEmailMock = vi.fn();
vi.mock("@/lib/newsletter/mailer", () => ({
  sendTransactionalEmail: (...args: unknown[]) =>
    sendTransactionalEmailMock(...args),
}));

const { sendMarketDigest } = await import("./market-digest");

function listing(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "listing-1",
    title: "Catan – Seefahrer",
    priceEuros: 12,
    ...overrides,
  };
}

beforeEach(() => {
  sendTransactionalEmailMock.mockReset();
  sendTransactionalEmailMock.mockResolvedValue(undefined);
  prismaMock.marketListing.findMany.mockResolvedValue([]);
  prismaMock.meeple.findMany.mockResolvedValue([]);
});

describe("sendMarketDigest", () => {
  it("sends nothing when there are no new listings", async () => {
    prismaMock.marketListing.findMany.mockResolvedValue([]);

    const result = await sendMarketDigest();

    expect(result).toEqual({
      newListings: 0,
      recipients: 0,
      succeeded: 0,
      failed: 0,
    });
    expect(prismaMock.meeple.findMany).not.toHaveBeenCalled();
    expect(sendTransactionalEmailMock).not.toHaveBeenCalled();
  });

  it("only queries opted-in meeples with an email address", async () => {
    prismaMock.marketListing.findMany.mockResolvedValue([listing()] as never);
    prismaMock.meeple.findMany.mockResolvedValue([
      { email: "a@example.com" },
    ] as never);

    await sendMarketDigest();

    expect(prismaMock.meeple.findMany).toHaveBeenCalledWith({
      where: { marketNewsletterOptIn: true, email: { not: null } },
      select: { email: true },
    });
  });

  it("sends one digest mail per recipient and reports the summary", async () => {
    prismaMock.marketListing.findMany.mockResolvedValue([
      listing(),
      listing({ id: "listing-2", title: "Wingspan" }),
    ] as never);
    prismaMock.meeple.findMany.mockResolvedValue([
      { email: "a@example.com" },
      { email: "b@example.com" },
    ] as never);

    const result = await sendMarketDigest();

    expect(sendTransactionalEmailMock).toHaveBeenCalledTimes(2);
    expect(sendTransactionalEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "a@example.com",
        subject: "Neue Angebote im Marktplatz",
      }),
    );
    expect(result).toEqual({
      newListings: 2,
      recipients: 2,
      succeeded: 2,
      failed: 0,
    });
  });

  it("counts a failed send without throwing", async () => {
    prismaMock.marketListing.findMany.mockResolvedValue([listing()] as never);
    prismaMock.meeple.findMany.mockResolvedValue([
      { email: "a@example.com" },
      { email: "b@example.com" },
    ] as never);
    sendTransactionalEmailMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("boom"));

    const result = await sendMarketDigest();

    expect(result).toEqual({
      newListings: 1,
      recipients: 2,
      succeeded: 1,
      failed: 1,
    });
  });
});

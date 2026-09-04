import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  offerPrivateGameForEvent,
  withdrawPrivateGameOffer,
  issuePrivateLoan,
  returnPrivateLoan,
  listOfferedPrivateLoansForEvent,
} = await import("./private-event-loans");

describe("offerPrivateGameForEvent (#122)", () => {
  it("rejects a title that isn't in the owner's private collection", async () => {
    prismaMock.privateGameCollectionEntry.findUnique.mockResolvedValue(null);

    const result = await offerPrivateGameForEvent(
      "meeple-1",
      "event-1",
      "bg-1",
    );

    expect(result).toEqual({
      error: "Dieser Titel ist nicht in deiner privaten Collection.",
    });
    expect(prismaMock.privateEventLoan.create).not.toHaveBeenCalled();
  });

  it("creates a new offer when none exists yet", async () => {
    prismaMock.privateGameCollectionEntry.findUnique.mockResolvedValue({
      id: "entry-1",
    } as never);
    prismaMock.privateEventLoan.findUnique.mockResolvedValue(null);

    const result = await offerPrivateGameForEvent(
      "meeple-1",
      "event-1",
      "bg-1",
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.privateEventLoan.create).toHaveBeenCalledWith({
      data: {
        eventId: "event-1",
        ownerMeepleId: "meeple-1",
        boardGameId: "bg-1",
      },
    });
  });

  it("is a no-op when already offered or loaned", async () => {
    prismaMock.privateGameCollectionEntry.findUnique.mockResolvedValue({
      id: "entry-1",
    } as never);
    prismaMock.privateEventLoan.findUnique.mockResolvedValue({
      status: "LOANED",
    } as never);

    const result = await offerPrivateGameForEvent(
      "meeple-1",
      "event-1",
      "bg-1",
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.privateEventLoan.create).not.toHaveBeenCalled();
    expect(prismaMock.privateEventLoan.update).not.toHaveBeenCalled();
  });

  it("re-offers a previously returned loan", async () => {
    prismaMock.privateGameCollectionEntry.findUnique.mockResolvedValue({
      id: "entry-1",
    } as never);
    prismaMock.privateEventLoan.findUnique.mockResolvedValue({
      status: "RETURNED",
    } as never);

    const result = await offerPrivateGameForEvent(
      "meeple-1",
      "event-1",
      "bg-1",
    );

    expect(result).toEqual({ success: true });
    expect(prismaMock.privateEventLoan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "OFFERED" }),
      }),
    );
  });
});

describe("withdrawPrivateGameOffer (#122)", () => {
  it("withdraws a still-offered loan", async () => {
    prismaMock.privateEventLoan.deleteMany.mockResolvedValue({ count: 1 });

    const result = await withdrawPrivateGameOffer(
      "meeple-1",
      "event-1",
      "bg-1",
    );

    expect(result).toEqual({ success: true });
  });

  it("fails to withdraw an already-loaned offer", async () => {
    prismaMock.privateEventLoan.deleteMany.mockResolvedValue({ count: 0 });

    const result = await withdrawPrivateGameOffer(
      "meeple-1",
      "event-1",
      "bg-1",
    );

    expect(result).toEqual({
      error:
        "Freigabe kann nicht zurückgezogen werden — das Exemplar ist bereits ausgeliehen oder nicht (mehr) freigegeben.",
    });
  });
});

describe("issuePrivateLoan (#122)", () => {
  it("issues an offered loan", async () => {
    prismaMock.privateEventLoan.updateMany.mockResolvedValue({ count: 1 });

    const result = await issuePrivateLoan("loan-1", "ausleihe-meeple-1");

    expect(result).toEqual({ success: true });
    expect(prismaMock.privateEventLoan.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "loan-1", status: "OFFERED" },
      }),
    );
  });

  it("fails when the loan isn't offered anymore", async () => {
    prismaMock.privateEventLoan.updateMany.mockResolvedValue({ count: 0 });

    const result = await issuePrivateLoan("loan-1", "ausleihe-meeple-1");

    expect(result).toEqual({
      error: "Dieses Exemplar ist nicht (mehr) zur Ausgabe angeboten.",
    });
  });
});

describe("returnPrivateLoan (#122)", () => {
  it("returns a loaned loan", async () => {
    prismaMock.privateEventLoan.updateMany.mockResolvedValue({ count: 1 });

    const result = await returnPrivateLoan("loan-1");

    expect(result).toEqual({ success: true });
  });

  it("fails when the loan isn't on loan anymore", async () => {
    prismaMock.privateEventLoan.updateMany.mockResolvedValue({ count: 0 });

    const result = await returnPrivateLoan("loan-1");

    expect(result).toEqual({
      error: "Dieses Exemplar ist nicht (mehr) ausgeliehen.",
    });
  });
});

describe("listOfferedPrivateLoansForEvent (#122)", () => {
  it("excludes returned loans", async () => {
    prismaMock.privateEventLoan.findMany.mockResolvedValue([]);

    await listOfferedPrivateLoansForEvent("event-1");

    expect(prismaMock.privateEventLoan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { eventId: "event-1", status: { not: "RETURNED" } },
      }),
    );
  });
});

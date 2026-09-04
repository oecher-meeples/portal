import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const deleteBlobsMock = vi.fn();
vi.mock("@/lib/utils/blob-delete", () => ({
  deleteBlobs: (...args: unknown[]) => deleteBlobsMock(...args),
}));

const {
  anonymiseMeepleStufe1,
  anonymiseMeepleStufe2,
  anonymiseMemberStufe3,
  stufe3EligibleFrom,
  listMembersEligibleForStufe3,
} = await import("@/lib/members/anonymisation");

const NOW = new Date("2026-08-03T00:00:00Z");

const RESIGNED_AND_GONE = {
  id: "meeple-1",
  displayName: "Lea Beispiel",
  neonAuthUserId: "11111111-1111-1111-1111-111111111111",
  anonymizedAt: null,
};

const RESIGNED_MEMBER = {
  id: "member-1",
  resignedAt: new Date("2024-07-01T00:00:00Z"),
  membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
};

function givenAnonymisableMeeple(
  listings: { id: string; imageUrls: string[] }[] = [],
) {
  prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
  prismaMock.member.findUnique.mockResolvedValue(RESIGNED_MEMBER as never);
  prismaMock.gameHolding.count.mockResolvedValue(0);
  prismaMock.storageUnit.count.mockResolvedValue(0);
  prismaMock.marketListing.findMany.mockResolvedValue(listings as never);
}

beforeEach(() => {
  deleteBlobsMock.mockReset();
  deleteBlobsMock.mockResolvedValue(undefined);
  prismaMock.marketListing.findMany.mockResolvedValue([] as never);
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
});

describe("anonymiseMeepleStufe1", () => {
  it("rejects an unknown meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await anonymiseMeepleStufe1("nope")).toEqual({
      error: "Mitglied nicht gefunden.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an already Stufe-2-anonymised meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...RESIGNED_AND_GONE,
      anonymizedAt: new Date(),
    } as never);

    const result = await anonymiseMeepleStufe1("meeple-1");

    expect("error" in result && result.error).toMatch(/Stufe 2/);
  });

  it("clears optional fields, the generic display name and post authorship — no membership precondition", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.marketListing.findMany.mockResolvedValue([] as never);

    expect(await anonymiseMeepleStufe1("meeple-1")).toEqual({ success: true });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: {
        displayName: "Anonymer Meeple",
        bggUsername: null,
        bgaUsername: null,
        telegramHandle: null,
        signalHandle: null,
        discordHandle: null,
        address: null,
        shareAddress: false,
        doorbellNote: null,
      },
    });
    expect(prismaMock.post.updateMany).toHaveBeenCalledWith({
      where: { author: "Lea Beispiel" },
      data: { author: null },
    });
  });

  it("deletes uploaded images before touching the database", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.marketListing.findMany.mockResolvedValue([
      { id: "l-1", imageUrls: ["https://blob/a.jpg"] },
    ] as never);

    await anonymiseMeepleStufe1("meeple-1");

    expect(deleteBlobsMock).toHaveBeenCalledWith(["https://blob/a.jpg"]);
  });

  // #394: je Feld wird nur über die Autor-/Erfasser-Relation der zu
  // anonymisierenden meepleId gefiltert — ein Datensatz mit fremder
  // *MeepleId (Erwähnung, Halter, o. ä.) matcht diesen `where`-Filter nicht
  // und bleibt dadurch unangetastet. Das *ist* der Mechanismus, der
  // "fremder Text bleibt unangetastet" garantiert, nicht ein zusätzlicher
  // Check — die Tests unten prüfen daher, dass jedes Update exakt auf die
  // eigene Relation der Person scoped, nicht auf einen anderen Datensatz.
  it("clears LfgPost title/description only for the meeple's own posts", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleStufe1("meeple-1");

    expect(prismaMock.lfgPost.updateMany).toHaveBeenCalledWith({
      where: { createdByMeepleId: "meeple-1" },
      data: { title: "", description: "" },
    });
  });

  it("clears MarketListing title/description together with the existing image cleanup", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleStufe1("meeple-1");

    expect(prismaMock.marketListing.updateMany).toHaveBeenCalledWith({
      where: { sellerMeepleId: "meeple-1" },
      data: { imageUrls: [], title: "", description: null },
    });
  });

  it("clears SparePartListing description only for the meeple's own listings", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleStufe1("meeple-1");

    expect(prismaMock.sparePartListing.updateMany).toHaveBeenCalledWith({
      where: { keeperMeepleId: "meeple-1" },
      data: { description: null },
    });
  });

  it("clears GameHolding.note only where the meeple recorded it themselves, not where they're merely the subject", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleStufe1("meeple-1");

    // recordedByMeepleId, nicht vereinsmitgliedId — sonst würde eine fremde
    // Notiz über die anonymisierte Person gelöscht statt eine eigene.
    expect(prismaMock.gameHolding.updateMany).toHaveBeenCalledWith({
      where: { recordedByMeepleId: "meeple-1" },
      data: { note: null },
    });
  });

  it("clears StorageUnitMove.locationNote only where the meeple recorded it themselves", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleStufe1("meeple-1");

    expect(prismaMock.storageUnitMove.updateMany).toHaveBeenCalledWith({
      where: { recordedByMeepleId: "meeple-1" },
      data: { locationNote: null },
    });
  });
});

describe("anonymiseMeepleStufe2", () => {
  it("rejects an unknown meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await anonymiseMeepleStufe2("nope", NOW)).toEqual({
      error: "Mitglied nicht gefunden.",
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an already anonymised meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...RESIGNED_AND_GONE,
      anonymizedAt: new Date(),
    } as never);

    expect(await anonymiseMeepleStufe2("meeple-1", NOW)).toEqual({
      error: "Dieses Mitglied ist bereits anonymisiert.",
    });
  });

  it("rejects a meeple that has not left yet", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(RESIGNED_AND_GONE as never);
    prismaMock.member.findUnique.mockResolvedValue({
      resignedAt: null,
      membershipEndsAt: null,
    } as never);

    expect(await anonymiseMeepleStufe2("meeple-1", NOW)).toEqual({
      error: "Nur ausgetretene Mitglieder können anonymisiert werden.",
    });
  });

  it("rejects a meeple that still holds a club game or unit", async () => {
    givenAnonymisableMeeple();
    prismaMock.gameHolding.count.mockResolvedValue(2);

    const result = await anonymiseMeepleStufe2("meeple-1", NOW);

    expect("error" in result && result.error).toMatch(/Erst zurückholen/);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("runs Stufe 1, then hard-deletes the login and unlinks the Member", async () => {
    givenAnonymisableMeeple();

    expect(await anonymiseMeepleStufe2("meeple-1", NOW)).toEqual({
      success: true,
    });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(3);
    expect(prismaMock.member.update).toHaveBeenCalledWith({
      where: { id: "member-1" },
      data: { meepleId: null },
    });
    expect(prismaMock.meeple.update).toHaveBeenCalledWith({
      where: { id: "meeple-1" },
      data: { neonAuthUserId: null, anonymizedAt: NOW },
    });
  });

  it("closes an open deletion request in the same transaction", async () => {
    givenAnonymisableMeeple();

    await anonymiseMeepleStufe2("meeple-1", NOW);

    expect(prismaMock.deletionRequest.updateMany).toHaveBeenCalledWith({
      where: { meepleId: "meeple-1", handledAt: null },
      data: { handledAt: NOW },
    });
  });

  it("leaves the member un-anonymised when blob deletion fails", async () => {
    givenAnonymisableMeeple([{ id: "l-1", imageUrls: ["https://blob/a.jpg"] }]);
    deleteBlobsMock.mockRejectedValue(new Error("blob boom"));

    await expect(anonymiseMeepleStufe2("meeple-1", NOW)).rejects.toThrow(
      "blob boom",
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalled();
  });

  it("rolls back when the raw sql fails", async () => {
    givenAnonymisableMeeple();
    prismaMock.$executeRaw.mockRejectedValueOnce(new Error("db boom"));

    await expect(anonymiseMeepleStufe2("meeple-1", NOW)).rejects.toThrow(
      "db boom",
    );
    expect(prismaMock.meeple.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ anonymizedAt: NOW }),
      }),
    );
  });
});

describe("stufe3EligibleFrom", () => {
  it("adds 12 months to the given date", () => {
    expect(stufe3EligibleFrom(new Date("2025-01-01T00:00:00Z"))).toEqual(
      new Date("2026-01-01T00:00:00Z"),
    );
  });
});

describe("anonymiseMemberStufe3", () => {
  it("rejects an unknown member", async () => {
    prismaMock.member.findUnique.mockResolvedValue(null);

    expect(await anonymiseMemberStufe3("nope", NOW)).toEqual({
      error: "Vereinsmitglied nicht gefunden.",
    });
  });

  it("rejects a member without a membershipEndsAt", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "member-1",
      membershipEndsAt: null,
    } as never);

    const result = await anonymiseMemberStufe3("member-1", NOW);

    expect("error" in result && result.error).toMatch(/Austrittsdatum/);
  });

  it("rejects before the 12-month mark", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "member-1",
      membershipEndsAt: new Date("2026-01-01T00:00:00Z"),
    } as never);

    const result = await anonymiseMemberStufe3("member-1", NOW);

    expect("error" in result && result.error).toMatch(/12 Monate/);
    expect(prismaMock.member.delete).not.toHaveBeenCalled();
  });

  it("rejects a member with an open holding", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "member-1",
      membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
    } as never);
    prismaMock.gameHolding.count.mockResolvedValue(1);

    const result = await anonymiseMemberStufe3("member-1", NOW);

    expect("error" in result && result.error).toMatch(/Vereinsspiele/);
    expect(prismaMock.member.delete).not.toHaveBeenCalled();
  });

  it("deletes the member row once eligible", async () => {
    prismaMock.member.findUnique.mockResolvedValue({
      id: "member-1",
      membershipEndsAt: new Date("2025-01-01T00:00:00Z"),
    } as never);
    prismaMock.gameHolding.count.mockResolvedValue(0);

    expect(await anonymiseMemberStufe3("member-1", NOW)).toEqual({
      success: true,
    });
    expect(prismaMock.member.delete).toHaveBeenCalledWith({
      where: { id: "member-1" },
    });
  });
});

describe("listMembersEligibleForStufe3", () => {
  it("excludes members that still hold a club game", async () => {
    prismaMock.member.findMany.mockResolvedValue([
      { id: "member-1", membershipEndsAt: new Date("2025-01-01T00:00:00Z") },
      { id: "member-2", membershipEndsAt: new Date("2025-01-01T00:00:00Z") },
    ] as never);
    prismaMock.gameHolding.count
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0);

    const result = await listMembersEligibleForStufe3(NOW);

    expect(result.map((m) => m.id)).toEqual(["member-2"]);
  });
});

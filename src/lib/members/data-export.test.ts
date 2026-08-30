import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { collectMeeplePersonalData, MEEPLE_RELATED_MODELS } =
  await import("@/lib/members/data-export");

const MEEPLE = {
  id: "meeple-1",
  memberNumber: 42,
  displayName: "Jan Herwig",
  joinedAt: new Date("2025-01-01"),
  anonymizedAt: null,
  bggUsername: "janh",
  bgaUsername: null,
  telegramHandle: "@janh",
  signalHandle: null,
  discordHandle: null,
  address: "Musterstraße 1, 52062 Aachen",
  shareAddress: true,
  doorbellNote: "bei Fam. Reiners klingeln",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2026-01-01"),
  neonAuthUserId: "user-1",
};

const MEMBER = {
  id: "member-1",
  memberNumber: 42,
  lastName: null,
  firstName: null,
  birthDate: null,
  birthPlace: null,
  street: null,
  postalCode: null,
  city: null,
  phone: null,
  email: "jan@example.org",
  selbstgewaehlterBeitrag: null,
  ibanLast4: "1234",
  accountHolder: "Jan Herwig",
  resignedAt: null,
  membershipEndsAt: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2026-01-01"),
};

/** Every findMany the export calls, so a test can point one of them at data. */
const FIND_MANY_MOCKS = [
  "bankDataAccessLog",
  "deletionRequest",
  "explainerAttendance",
  "explainerGame",
  "fleaMarketItem",
  "gameHolding",
  "helperAvailability",
  "invite",
  "lfgParticipant",
  "lfgPost",
  "marketListing",
  "privateGameCollectionEntry",
  "shiftBooking",
  "sparePartListing",
  "storageUnit",
  "storageUnitMove",
  "userRole",
] as const;

beforeEach(() => {
  prismaMock.meeple.findUnique.mockResolvedValue(MEEPLE as never);
  prismaMock.member.findUnique.mockResolvedValue(MEMBER as never);
  for (const model of FIND_MANY_MOCKS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prismaMock as any)[model].findMany.mockResolvedValue([]);
  }
});

describe("collectMeeplePersonalData", () => {
  it("returns null for an unknown meeple", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue(null);

    expect(await collectMeeplePersonalData("nope")).toBeNull();
  });

  it("covers every model listed in MEEPLE_RELATED_MODELS", async () => {
    const result = await collectMeeplePersonalData("meeple-1");

    expect(Object.keys(result!.daten).sort()).toEqual(
      [...MEEPLE_RELATED_MODELS].sort(),
    );
  });

  it("collects data from several tables at once", async () => {
    prismaMock.lfgPost.findMany.mockResolvedValue([
      { id: "lfg-1", title: "Arche Nova gesucht" },
    ] as never);
    prismaMock.marketListing.findMany.mockResolvedValue([
      { id: "listing-1", title: "Azul" },
    ] as never);
    prismaMock.shiftBooking.findMany.mockResolvedValue([
      { shiftId: "shift-1", meepleId: "meeple-1" },
    ] as never);

    const result = await collectMeeplePersonalData("meeple-1");

    expect(result!.daten.LfgPost).toHaveLength(1);
    expect(result!.daten.MarketListing).toHaveLength(1);
    expect(result!.daten.ShiftBooking).toHaveLength(1);
    expect(result!.daten.GameHolding).toEqual([]);
  });

  it("exports only the last four IBAN digits, never the encrypted value", async () => {
    const result = await collectMeeplePersonalData("meeple-1");

    const serialised = JSON.stringify(result);
    expect(result!.daten.Member).toMatchObject({ ibanLast4: "1234" });
    expect(serialised).not.toContain("ibanEncrypted");
    expect(
      prismaMock.member.findUnique.mock.calls[0][0].select,
    ).not.toHaveProperty("ibanEncrypted");
  });

  it("does not leak the login account id into the exported meeple record", async () => {
    const result = await collectMeeplePersonalData("meeple-1");

    expect(result!.daten.Meeple).not.toHaveProperty("neonAuthUserId");
  });

  it("includes address and doorbell note in the export", async () => {
    const result = await collectMeeplePersonalData("meeple-1");

    expect(result!.daten.Meeple).toMatchObject({
      address: "Musterstraße 1, 52062 Aachen",
      shareAddress: true,
      doorbellNote: "bei Fam. Reiners klingeln",
    });
  });

  it("includes rows where the meeple only acted as the recording person", async () => {
    prismaMock.gameHolding.findMany.mockResolvedValue([
      {
        id: "holding-1",
        recordedByMeepleId: "meeple-1",
        vereinsmitgliedId: null,
      },
    ] as never);

    await collectMeeplePersonalData("meeple-1");

    expect(prismaMock.gameHolding.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { vereinsmitgliedId: "member-1" },
            { recordedByMeepleId: "meeple-1" },
          ],
        },
      }),
    );
  });

  it("queries flea market items both as seller and as approver", async () => {
    await collectMeeplePersonalData("meeple-1");

    expect(prismaMock.fleaMarketItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { sellerMeepleId: "meeple-1" },
            { approvedByMeepleId: "meeple-1" },
          ],
        },
      }),
    );
  });

  it("skips login-account-keyed tables when the meeple has no login yet", async () => {
    prismaMock.meeple.findUnique.mockResolvedValue({
      ...MEEPLE,
      neonAuthUserId: null,
    } as never);

    const result = await collectMeeplePersonalData("meeple-1");

    expect(result!.daten.UserRole).toEqual([]);
    expect(result!.daten.Invite).toEqual([]);
    expect(prismaMock.userRole.findMany).not.toHaveBeenCalled();
    expect(prismaMock.invite.findMany).not.toHaveBeenCalled();
  });

  it("stamps the export time and names the IBAN restriction", async () => {
    const result = await collectMeeplePersonalData(
      "meeple-1",
      new Date("2026-08-03T12:00:00Z"),
    );

    expect(result!.exportedAt).toBe("2026-08-03T12:00:00.000Z");
    expect(result!.hinweise.join(" ")).toContain("IBAN");
  });
});

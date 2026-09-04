import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `scanGiveToMeeple`/`scanReturnToMeeple`-Tests, ausgelagert aus
 * `holding-actions.test.ts` (400-Zeilen-Grenze, analog
 * `actions-excerpt.test.ts`) — eigenes, schlankes Mock-Setup statt das der
 * Haupt-Testdatei zu importieren. Schwerpunkt #465 (`viaTargetQrScan`).
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: vi.fn() }));

const requireMeeplePermissionMock = vi.fn();
vi.mock("@/lib/members/meeples", async () => {
  const actual = await vi.importActual<typeof import("@/lib/members/meeples")>(
    "@/lib/members/meeples",
  );
  return { ...actual, requireMeeplePermission: requireMeeplePermissionMock };
});

const memberFindUniqueMock = vi.fn();
vi.mock("@/lib/utils/prisma", () => ({
  prisma: {
    member: {
      findUnique: (...args: unknown[]) => memberFindUniqueMock(...args),
    },
  },
}));

const handOverGameMock = vi.fn();
const returnGameMock = vi.fn();
vi.mock("@/lib/ludothek/holdings", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/ludothek/holdings")
  >("@/lib/ludothek/holdings");
  return {
    ...actual,
    handOverGame: (...args: unknown[]) => handOverGameMock(...args),
    returnGame: (...args: unknown[]) => returnGameMock(...args),
  };
});

const { scanGiveToMeeple, scanReturnToMeeple } =
  await import("./holding-actions");

const SELF = { id: "meeple-self", anonymizedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  requireMeeplePermissionMock.mockResolvedValue(SELF);
  memberFindUniqueMock.mockImplementation(
    ({ where }: { where: { meepleId: string } }) =>
      where.meepleId === "meeple-other"
        ? Promise.resolve({ id: "member-other" })
        : Promise.resolve(null),
  );
  handOverGameMock.mockResolvedValue({ id: "holding-new" });
  returnGameMock.mockResolvedValue({ id: "holding-new" });
});

describe("scanGiveToMeeple — viaTargetQrScan (#465)", () => {
  it("passes viaTargetQrScan through when the target came from their own QR code", async () => {
    await scanGiveToMeeple("game-1", "meeple-other", true);

    expect(handOverGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-other",
      recordedByMeepleId: "meeple-self",
      isSelf: false,
      viaTargetQrScan: true,
    });
  });
});

describe("scanReturnToMeeple", () => {
  it("records a return to a person, distinct from a handover", async () => {
    await scanReturnToMeeple("game-1", "meeple-other");

    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-other",
      recordedByMeepleId: "meeple-self",
      viaTargetQrScan: false,
    });
    expect(handOverGameMock).not.toHaveBeenCalled();
  });

  it("passes viaTargetQrScan through when the target came from their own QR code", async () => {
    await scanReturnToMeeple("game-1", "meeple-other", true);

    expect(returnGameMock).toHaveBeenCalledWith({
      gameCopyId: "game-1",
      toVereinsmitgliedId: "member-other",
      recordedByMeepleId: "meeple-self",
      viaTargetQrScan: true,
    });
  });
});

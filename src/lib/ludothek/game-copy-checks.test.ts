import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import {
  formatDefectCondition,
  GAME_COPY_CHECK_RESULT_LABELS,
  isGameIssueKind,
} from "./game-issue";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  applyCheck,
  confirmGameCopyCheck,
  GameCopyNotFoundError,
  reportGameCopyDefect,
  statusAfterCheck,
} = await import("./game-copy-checks");

const CHECKED_AT = new Date("2026-11-23T10:00:00Z");

function givenCopy(status: string | null) {
  prismaMock.gameCopy.findUnique.mockResolvedValue(
    (status ? { status } : null) as never,
  );
}

beforeEach(() => {
  prismaMock.$transaction.mockImplementation((arg) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as never),
  );
  prismaMock.gameCopyCheck.create.mockResolvedValue({
    id: "check-1",
    checkedAt: CHECKED_AT,
  } as never);
  givenCopy("ACTIVE");
});

describe("game-issue", () => {
  it("formats the condition as '<Label>: <note>' with a trimmed note", () => {
    expect(formatDefectCondition("beschaedigt", "  Karte fehlt ")).toBe(
      "Beschädigt: Karte fehlt",
    );
  });

  it("accepts only known kinds, not inherited object keys", () => {
    expect(isGameIssueKind("nicht_spielbar")).toBe(true);
    expect(isGameIssueKind("undefined")).toBe(false);
    expect(isGameIssueKind("toString")).toBe(false);
    expect(isGameIssueKind(undefined)).toBe(false);
  });

  it("labels every check result", () => {
    expect(GAME_COPY_CHECK_RESULT_LABELS).toEqual({
      COMPLETE: "Vollständig",
      INCOMPLETE: "Unvollständig spielbar",
      UNPLAYABLE: "Nicht spielbar",
      DAMAGED: "Beschädigt",
    });
  });
});

describe("statusAfterCheck", () => {
  it.each([
    ["COMPLETE", "ACTIVE", "ACTIVE"],
    ["COMPLETE", "MAINTENANCE", "ACTIVE"],
    ["COMPLETE", "DEINVENTARISED", "DEINVENTARISED"],
    ["INCOMPLETE", "ACTIVE", "ACTIVE"],
    ["INCOMPLETE", "MAINTENANCE", "ACTIVE"],
    ["INCOMPLETE", "DEINVENTARISED", "DEINVENTARISED"],
    ["DAMAGED", "ACTIVE", "ACTIVE"],
    ["DAMAGED", "MAINTENANCE", "ACTIVE"],
    ["DAMAGED", "DEINVENTARISED", "DEINVENTARISED"],
    ["UNPLAYABLE", "ACTIVE", "MAINTENANCE"],
    ["UNPLAYABLE", "MAINTENANCE", "MAINTENANCE"],
    ["UNPLAYABLE", "DEINVENTARISED", "DEINVENTARISED"],
  ] as const)("%s on %s → %s", (result, current, expected) => {
    expect(statusAfterCheck(result, current)).toBe(expected);
  });
});

describe("applyCheck", () => {
  it("records the check and moves the copy to the new state", async () => {
    givenCopy("MAINTENANCE");

    await applyCheck({
      gameCopyId: "game-1",
      checkedByMeepleId: "meeple-1",
      result: "COMPLETE",
      condition: null,
    });

    expect(prismaMock.gameCopyCheck.create).toHaveBeenCalledWith({
      data: {
        gameCopyId: "game-1",
        checkedByMeepleId: "meeple-1",
        result: "COMPLETE",
        note: null,
      },
    });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        condition: null,
        lastCheckedAt: CHECKED_AT,
        needsCompletenessCheck: false,
        status: "ACTIVE",
      },
    });
  });

  it("still records a check on a deinventarised copy", async () => {
    givenCopy("DEINVENTARISED");

    await applyCheck({
      gameCopyId: "game-1",
      checkedByMeepleId: "meeple-1",
      result: "UNPLAYABLE",
      condition: "Nicht spielbar: Wasserschaden",
    });

    expect(prismaMock.gameCopyCheck.create).toHaveBeenCalled();
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DEINVENTARISED" }),
      }),
    );
  });

  it("rejects an unknown copy without writing", async () => {
    givenCopy(null);

    await expect(
      applyCheck({
        gameCopyId: "missing",
        checkedByMeepleId: "meeple-1",
        result: "COMPLETE",
        condition: null,
      }),
    ).rejects.toThrow(GameCopyNotFoundError);
    expect(prismaMock.gameCopyCheck.create).not.toHaveBeenCalled();
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });
});

describe("confirmGameCopyCheck", () => {
  it("records a COMPLETE check with the trimmed note, empty → null", async () => {
    await confirmGameCopyCheck("game-1", "meeple-1", "  Neuwertig ");
    expect(prismaMock.gameCopyCheck.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ result: "COMPLETE", note: "Neuwertig" }),
    });

    await confirmGameCopyCheck("game-1", "meeple-1", "   ");
    expect(prismaMock.gameCopyCheck.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ note: null }),
    });
  });
});

describe("reportGameCopyDefect", () => {
  it.each([
    ["unvollstaendig", "INCOMPLETE", "Unvollständig spielbar", "ACTIVE"],
    ["beschaedigt", "DAMAGED", "Beschädigt", "ACTIVE"],
    ["nicht_spielbar", "UNPLAYABLE", "Nicht spielbar", "MAINTENANCE"],
  ] as const)(
    "%s → %s check, prefixed condition, status %s",
    async (kind, result, label, status) => {
      const outcome = await reportGameCopyDefect(
        "game-1",
        "meeple-1",
        kind,
        "Karte fehlt",
      );

      expect(outcome).toEqual({ success: true });
      expect(prismaMock.gameCopyCheck.create).toHaveBeenCalledWith({
        data: {
          gameCopyId: "game-1",
          checkedByMeepleId: "meeple-1",
          result,
          note: `${label}: Karte fehlt`,
        },
      });
      expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
        where: { id: "game-1" },
        data: {
          condition: `${label}: Karte fehlt`,
          lastCheckedAt: CHECKED_AT,
          needsCompletenessCheck: false,
          status,
        },
      });
    },
  );

  it("rejects an unknown kind without touching the copy", async () => {
    const result = await reportGameCopyDefect(
      "game-1",
      "meeple-1",
      "kaputtx",
      "Riss",
    );

    expect(result).toEqual({ error: "Unbekannte Mangel-Art." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty note", async () => {
    const result = await reportGameCopyDefect(
      "game-1",
      "meeple-1",
      "beschaedigt",
      "  ",
    );

    expect(result).toEqual({ error: "Bitte eine Notiz zum Mangel angeben." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";
import { formatDefectCondition, isGameIssueKind } from "./game-issue";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { clearGameCopyDefect, reportGameCopyDefect } =
  await import("./game-defects");

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
});

describe("reportGameCopyDefect", () => {
  it("moves the copy to MAINTENANCE and stores the prefixed condition", async () => {
    const result = await reportGameCopyDefect("game-1", "beschaedigt", "Riss");

    expect(result).toEqual({ success: true });
    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: {
        condition: "Beschädigt: Riss",
        lastCheckedAt: expect.any(Date),
        status: "MAINTENANCE",
      },
    });
  });

  it("rejects an unknown kind without touching the copy", async () => {
    const result = await reportGameCopyDefect("game-1", "kaputtx", "Riss");

    expect(result).toEqual({ error: "Unbekannte Mangel-Art." });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });

  it("rejects an empty note", async () => {
    const result = await reportGameCopyDefect("game-1", "beschaedigt", "  ");

    expect(result).toEqual({ error: "Bitte eine Notiz zum Mangel angeben." });
    expect(prismaMock.gameCopy.update).not.toHaveBeenCalled();
  });
});

describe("clearGameCopyDefect", () => {
  it("moves the copy back to ACTIVE", async () => {
    await clearGameCopyDefect("game-1");

    expect(prismaMock.gameCopy.update).toHaveBeenCalledWith({
      where: { id: "game-1" },
      data: { status: "ACTIVE" },
    });
  });
});

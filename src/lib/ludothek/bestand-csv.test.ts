import { beforeEach, describe, expect, it, vi } from "vitest";

const requireGamesManagePermissionMock = vi.fn();
vi.mock("@/lib/ludothek/permissions", () => ({
  requireGamesManagePermission: () => requireGamesManagePermissionMock(),
}));

const buildAdminBoardGameRowsMock = vi.fn();
vi.mock("@/lib/ludothek/admin-bestand-rows", () => ({
  buildAdminBoardGameRows: (...args: unknown[]) =>
    buildAdminBoardGameRowsMock(...args),
}));

const { exportBestandCsv } = await import("./bestand-csv");

beforeEach(() => {
  requireGamesManagePermissionMock.mockReset();
  buildAdminBoardGameRowsMock.mockReset();
  requireGamesManagePermissionMock.mockResolvedValue({ id: "user-1" });
});

describe("exportBestandCsv without games:manage permission", () => {
  it("returns an error and never queries", async () => {
    requireGamesManagePermissionMock.mockResolvedValue(null);

    const result = await exportBestandCsv("all");

    expect(result).toEqual({
      error: "Keine Berechtigung für den Bestands-Export.",
    });
    expect(buildAdminBoardGameRowsMock).not.toHaveBeenCalled();
  });
});

describe("exportBestandCsv scope: filtered", () => {
  it("uses the client-supplied rows without re-querying", async () => {
    const result = await exportBestandCsv("filtered", [
      {
        title: "Wingspan",
        ean: "1234567890123",
        status: "ACTIVE",
        zustand: "gut",
        locationChain: "Regal 2",
      },
    ]);

    expect(buildAdminBoardGameRowsMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ filename: "bestand-gefiltert.csv" });
    expect(result.csv?.split("\r\n")[1]).toBe(
      "Wingspan;1234567890123;ACTIVE;gut;Regal 2",
    );
  });
});

describe("exportBestandCsv scope: all", () => {
  it("fetches rows without deinventarised copies", async () => {
    buildAdminBoardGameRowsMock.mockResolvedValue([]);

    const result = await exportBestandCsv("all");

    expect(buildAdminBoardGameRowsMock).toHaveBeenCalledWith({
      showDeinventarised: false,
    });
    expect(result).toMatchObject({ filename: "bestand-vollstaendig.csv" });
  });
});

describe("exportBestandCsv scope: all-with-deinventarised", () => {
  it("fetches rows including deinventarised copies", async () => {
    buildAdminBoardGameRowsMock.mockResolvedValue([]);

    const result = await exportBestandCsv("all-with-deinventarised");

    expect(buildAdminBoardGameRowsMock).toHaveBeenCalledWith({
      showDeinventarised: true,
    });
    expect(result).toMatchObject({
      filename: "bestand-mit-deinventarisierten.csv",
    });
  });
});

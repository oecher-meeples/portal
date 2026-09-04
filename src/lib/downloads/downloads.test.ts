import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const {
  listVisibleDownloads,
  listOfflineDownloadsForAdmin,
  findPublicDownloadByTitle,
  formatFileSize,
} = await import("@/lib/downloads/downloads");

describe("listVisibleDownloads", () => {
  it("shows only PUBLIC downloads for a guest", async () => {
    await listVisibleDownloads("gast");

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: "PUBLIC" },
      orderBy: { order: "asc" },
    });
  });

  it("shows PUBLIC and INTERNAL downloads for a member", async () => {
    await listVisibleDownloads("mitglied");

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["PUBLIC", "INTERNAL"] } },
      orderBy: { order: "asc" },
    });
  });

  it("shows PUBLIC and INTERNAL downloads for an admin", async () => {
    await listVisibleDownloads("admin");

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["PUBLIC", "INTERNAL"] } },
      orderBy: { order: "asc" },
    });
  });

  it("never surfaces OFFLINE downloads, for any tier", async () => {
    for (const tier of ["gast", "mitglied", "admin"] as const) {
      await listVisibleDownloads(tier);
      const call = prismaMock.download.findMany.mock.calls.at(-1)?.[0];
      expect(JSON.stringify(call?.where)).not.toContain("OFFLINE");
    }
  });
});

describe("listOfflineDownloadsForAdmin", () => {
  it("queries only OFFLINE downloads, most recent file change first", async () => {
    await listOfflineDownloadsForAdmin();

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: "OFFLINE" },
      orderBy: { fileUpdatedAt: "desc" },
    });
  });
});

describe("findPublicDownloadByTitle (#423)", () => {
  it("queries by title, restricted to PUBLIC", async () => {
    await findPublicDownloadByTitle("Mitgliedsantrag");

    expect(prismaMock.download.findFirst).toHaveBeenCalledWith({
      where: { title: "Mitgliedsantrag", status: "PUBLIC" },
    });
  });
});

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1.0 KB"],
    [215040, "210 KB"],
    [1048576, "1.0 MB"],
    [1572864, "1.5 MB"],
    [10485760, "10 MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });
});

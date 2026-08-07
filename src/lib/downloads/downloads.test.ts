import { describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const { listVisibleDownloads, listAllDownloadsForAdmin, formatFileSize } =
  await import("@/lib/downloads/downloads");

describe("listVisibleDownloads", () => {
  it("shows only PUBLIC downloads for a guest", async () => {
    await listVisibleDownloads("gast");

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: "PUBLIC" },
      orderBy: { createdAt: "asc" },
    });
  });

  it("shows PUBLIC and INTERNAL downloads for a member", async () => {
    await listVisibleDownloads("mitglied");

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["PUBLIC", "INTERNAL"] } },
      orderBy: { createdAt: "asc" },
    });
  });

  it("shows PUBLIC and INTERNAL downloads for an admin", async () => {
    await listVisibleDownloads("admin");

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      where: { status: { in: ["PUBLIC", "INTERNAL"] } },
      orderBy: { createdAt: "asc" },
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

describe("listAllDownloadsForAdmin", () => {
  it("queries all downloads, newest first", async () => {
    await listAllDownloadsForAdmin();

    expect(prismaMock.download.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
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

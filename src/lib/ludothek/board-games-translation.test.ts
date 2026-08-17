import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/lib/__mocks__/prisma";

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/utils/prisma", () => ({ prisma: prismaMock }));

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth/server", () => ({ getCurrentUser: getCurrentUserMock }));

const fetchBggGameMock = vi.fn();
vi.mock("@/lib/bgg/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/bgg/client")>(
      "@/lib/bgg/client",
    );
  return {
    ...actual,
    fetchBggGame: (...args: unknown[]) => fetchBggGameMock(...args),
  };
});

const translateToGermanMock = vi.fn();
vi.mock("@/lib/bgg/translate", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bgg/translate")>(
    "@/lib/bgg/translate",
  );
  return {
    ...actual,
    translateToGerman: (...args: unknown[]) => translateToGermanMock(...args),
  };
});

const { BggApiError, BggNotFoundError } = await import("@/lib/bgg/client");
const { previewBggImport, translateDescription } =
  await import("./board-games");

beforeEach(() => {
  prismaMock.boardGame.count.mockResolvedValue(0);
  prismaMock.boardGame.findUnique.mockResolvedValue(null);
  prismaMock.boardGame.findFirst.mockResolvedValue(null);
});

describe("translateDescription", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await translateDescription("Build a modern zoo.");

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." });
    expect(translateToGermanMock).not.toHaveBeenCalled();
  });

  it("rejects a blank description without calling the translation API", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);

    const result = await translateDescription("   ");

    expect(result).toEqual({
      success: false,
      error: "Keine Beschreibung zum Übersetzen vorhanden.",
    });
    expect(translateToGermanMock).not.toHaveBeenCalled();
  });

  it("translates on demand for the 'Übersetzen'-Button in the title editor (#184)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    translateToGermanMock.mockResolvedValue("Baue einen modernen Zoo.");

    const result = await translateDescription("Build a modern zoo.");

    expect(translateToGermanMock).toHaveBeenCalledWith("Build a modern zoo.");
    expect(result).toEqual({
      success: true,
      text: "Baue einen modernen Zoo.",
    });
  });

  it("surfaces the translation error instead of throwing", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    translateToGermanMock.mockRejectedValue(new Error("translation boom"));

    const result = await translateDescription("Build a modern zoo.");

    expect(result).toEqual({ success: false, error: "translation boom" });
  });
});

describe("previewBggImport", () => {
  it("rejects when the user lacks the games:manage permission", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(0);

    const result = await previewBggImport(342942);

    expect(result).toEqual({ success: false, error: "Keine Berechtigung." });
    expect(fetchBggGameMock).not.toHaveBeenCalled();
  });

  it("returns the mapped preview data without persisting anything", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    const bggData = { title: "Ark Nova", mechanics: [] };
    fetchBggGameMock.mockResolvedValue(bggData);

    const result = await previewBggImport(342942);

    expect(result).toEqual({ success: true, data: bggData });
    expect(prismaMock.boardGame.create).not.toHaveBeenCalled();
    expect(prismaMock.boardGame.update).not.toHaveBeenCalled();
    expect(translateToGermanMock).not.toHaveBeenCalled();
  });

  it("translates the description via the translation API and mechanics via the fixed table (#184)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockResolvedValue({
      title: "Ark Nova",
      description: "Build a modern zoo.",
      mechanics: ["Worker Placement", "Some Unmapped Mechanic"],
    });
    translateToGermanMock.mockResolvedValue("Baue einen modernen Zoo.");

    const result = await previewBggImport(342942);

    expect(translateToGermanMock).toHaveBeenCalledWith("Build a modern zoo.");
    expect(result).toEqual({
      success: true,
      data: {
        title: "Ark Nova",
        description: "Baue einen modernen Zoo.",
        mechanics: ["Arbeitereinsatz", "Some Unmapped Mechanic"],
      },
    });
  });

  it("clears the description instead of saving English text when translation fails (#184)", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockResolvedValue({
      title: "Ark Nova",
      description: "Build a modern zoo.",
      mechanics: [],
    });
    translateToGermanMock.mockRejectedValue(new Error("translation API boom"));

    const result = await previewBggImport(342942);

    expect(result).toEqual({
      success: true,
      data: {
        title: "Ark Nova",
        description: null,
        mechanics: [],
      },
      hint: "Automatische Übersetzung der Beschreibung ist fehlgeschlagen — bitte manuell auf Deutsch ergänzen.",
    });
  });

  it("translates a BggNotFoundError into a speaking error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockRejectedValue(new BggNotFoundError(999999999));

    const result = await previewBggImport(999999999);

    expect(result).toEqual({
      success: false,
      error: "BoardGameGeek-Eintrag mit ID 999999999 wurde nicht gefunden.",
    });
  });

  it("translates a BggApiError into a speaking error", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.rolePermission.count.mockResolvedValue(1);
    fetchBggGameMock.mockRejectedValue(new BggApiError("boom", 503));

    const result = await previewBggImport(342942);

    expect(result).toEqual({
      success: false,
      error:
        "BoardGameGeek ist aktuell nicht erreichbar. Bitte später erneut versuchen.",
    });
  });
});

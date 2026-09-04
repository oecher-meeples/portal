import { describe, expect, it } from "vitest";
import {
  buildExemplarUrl,
  qrExportFilename,
  selectQrExportableCopies,
} from "./game-copy-qr-export";

describe("selectQrExportableCopies (#271)", () => {
  it("keeps only copies with a non-empty inventory number", () => {
    const copies = [
      { id: "1", title: "Ark Nova", inventoryNumber: "INV-001" },
      { id: "2", title: "Wingspan", inventoryNumber: null },
      { id: "3", title: "Azul", inventoryNumber: "  " },
    ];

    const result = selectQrExportableCopies(copies);

    expect(result).toEqual([
      { id: "1", title: "Ark Nova", inventoryNumber: "INV-001" },
    ]);
  });
});

describe("buildExemplarUrl (#271)", () => {
  it("builds the exemplar-level target route", () => {
    expect(buildExemplarUrl("https://portal.example", "INV-001")).toBe(
      "https://portal.example/ludothek/exemplar/INV-001",
    );
  });

  it("URL-encodes the inventory number", () => {
    expect(buildExemplarUrl("https://portal.example", "INV 001/A")).toBe(
      "https://portal.example/ludothek/exemplar/INV%20001%2FA",
    );
  });
});

describe("qrExportFilename (#271)", () => {
  it("prefixes the inventory number, sanitised title behind it", () => {
    expect(
      qrExportFilename({
        id: "1",
        title: "Ark Nova",
        inventoryNumber: "INV-001",
      }),
    ).toBe("INV-001_Ark Nova.png");
  });

  it("strips filesystem-unsafe characters from the title", () => {
    expect(
      qrExportFilename({
        id: "1",
        title: 'Catan: Seefahrer/"Städte & Ritter"',
        inventoryNumber: "INV-002",
      }),
    ).toBe("INV-002_Catan SeefahrerStädte & Ritter.png");
  });
});

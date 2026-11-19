import { describe, expect, it } from "vitest";
import {
  buildExemplarUrl,
  qrExportFilename,
  selectQrExportableCopies,
} from "./game-copy-qr-export";

describe("selectQrExportableCopies (#271)", () => {
  it("keeps only copies with an inventory number", () => {
    const copies = [
      { id: "1", title: "Ark Nova", inventoryNumber: 1 },
      { id: "2", title: "Wingspan", inventoryNumber: null },
    ];

    const result = selectQrExportableCopies(copies);

    expect(result).toEqual([
      { id: "1", title: "Ark Nova", inventoryNumber: 1 },
    ]);
  });
});

describe("buildExemplarUrl (#271)", () => {
  it("targets the short-id router (#545)", () => {
    expect(buildExemplarUrl("https://portal.example", 1)).toBe(
      "https://portal.example/id/inv-1",
    );
  });
});

describe("qrExportFilename (#271)", () => {
  it("prefixes the inventory number, sanitised title behind it", () => {
    expect(
      qrExportFilename({
        id: "1",
        title: "Ark Nova",
        inventoryNumber: 1,
      }),
    ).toBe("1_Ark Nova.png");
  });

  it("strips filesystem-unsafe characters from the title", () => {
    expect(
      qrExportFilename({
        id: "1",
        title: 'Catan: Seefahrer/"Städte & Ritter"',
        inventoryNumber: 2,
      }),
    ).toBe("2_Catan SeefahrerStädte & Ritter.png");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildExemplarUrl,
  exemplarLabelText,
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
  it("always targets the fixed short domain (#546)", () => {
    expect(buildExemplarUrl(1)).toBe(
      "https://short.oecher-meeples.org/id/inv-1",
    );
  });
});

describe("exemplarLabelText (#546)", () => {
  it("prints the same slug the QR code encodes", () => {
    expect(exemplarLabelText(42)).toBe("inv-42");
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

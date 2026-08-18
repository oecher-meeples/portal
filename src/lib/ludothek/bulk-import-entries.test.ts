import { describe, expect, it } from "vitest";
import {
  dedupeBulkImportEntries,
  mergeBulkImportEntries,
} from "./bulk-import-entries";

describe("mergeBulkImportEntries", () => {
  it("appends new entries after the existing ones", () => {
    expect(mergeBulkImportEntries(["Arche Nova"], ["Wingspan"])).toEqual([
      "Arche Nova",
      "Wingspan",
    ]);
  });

  it("skips a title already present, case-insensitively", () => {
    expect(
      mergeBulkImportEntries(["Arche Nova"], ["arche nova", "Wingspan"]),
    ).toEqual(["Arche Nova", "Wingspan"]);
  });

  it("skips an EAN already present regardless of formatting", () => {
    expect(
      mergeBulkImportEntries(
        ["4001504311896"],
        ["4001-5043-11896", "4260402312019"],
      ),
    ).toEqual(["4001504311896", "4260402312019"]);
  });

  it("skips duplicates within the incoming batch itself", () => {
    expect(mergeBulkImportEntries([], ["Wingspan", "Wingspan"])).toEqual([
      "Wingspan",
    ]);
  });

  it("ignores blank incoming entries", () => {
    expect(mergeBulkImportEntries(["Arche Nova"], ["", "  "])).toEqual([
      "Arche Nova",
    ]);
  });
});

describe("dedupeBulkImportEntries", () => {
  it("keeps the first occurrence of a duplicated title", () => {
    expect(
      dedupeBulkImportEntries(["Arche Nova", "Wingspan", "arche nova"]),
    ).toEqual(["Arche Nova", "Wingspan"]);
  });

  it("keeps the first occurrence of a duplicated EAN", () => {
    expect(
      dedupeBulkImportEntries(["4001504311896", "4001-5043-11896"]),
    ).toEqual(["4001504311896"]);
  });
});

import { describe, expect, it } from "vitest";
import { guestNameKey, parseGuestImportCsv } from "./guest-import-csv";

const context = {
  days: [
    { id: "d1", date: "2026-12-04T00:00:00.000Z" },
    { id: "d2", date: "2026-12-05T00:00:00.000Z" },
  ],
  roles: [
    { id: "r1", name: "Aufbau/Abbau" },
    { id: "r2", name: "Küche" },
  ],
};
const HEADER = "Name;Tag;Von;Bis;Rollen";

describe("parseGuestImportCsv", () => {
  it("parses a valid row", () => {
    const { rows, errors } = parseGuestImportCsv(
      `${HEADER}\nMax  Mustermann; 04.12.2026; 09:00; 18:00; aufbau/abbau, KÜCHE`,
      context,
    );
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      line: 2,
      name: "Max Mustermann",
      dayId: "d1",
      roleIds: ["r1", "r2"],
    });
    expect(new Date(rows[0].startsAt).getHours()).toBe(9);
    expect(new Date(rows[0].endsAt).getHours()).toBe(18);
  });

  it("rejects a wrong header", () => {
    const { rows, errors } = parseGuestImportCsv("a;b\nx;y", context);
    expect(rows).toEqual([]);
    expect(errors[0].line).toBe(1);
  });

  it("drops invalid rows with line errors but keeps valid ones", () => {
    const { rows, errors } = parseGuestImportCsv(
      [
        HEADER,
        "A;04.12.2026;09:00;10:00;Küche",
        "B;01.01.2020;09:00;10:00;Küche",
        "C;04.12.2026;9;10:00;Küche",
        "D;04.12.2026;10:00;09:00;Küche",
        "E;04.12.2026;09:00;10:00;Unbekannt",
        ";04.12.2026;09:00;10:00;Küche",
        "",
        "F;05.12.2026;09:00;10:00;Küche",
      ].join("\n"),
      context,
    );
    expect(rows.map((row) => row.name)).toEqual(["A", "F"]);
    expect(errors.map((error) => error.line)).toEqual([3, 4, 5, 6, 7]);
    expect(errors.every((error) => !error.message.includes("Unbekannt"))).toBe(
      true,
    );
  });
});

describe("guestNameKey", () => {
  it("normalizes whitespace and case", () => {
    expect(guestNameKey("  Max   MUSTERMANN ")).toBe("max mustermann");
  });
});

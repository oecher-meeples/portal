import { describe, expect, it } from "vitest";
import { buildExportDays } from "./shift-plan-export";

const at = (day: number, h: number, m = 0) => new Date(2026, 11, day, h, m);
const day = (id: string, d: number) => ({ id, date: new Date(2026, 11, d) });

const kitchen = (dayId: string, from: number, to: number, capacity = 1) => ({
  dayId,
  roleId: "kueche",
  roleName: "Küche",
  capacity,
  targetStartsAt: at(4, from),
  targetEndsAt: at(4, to),
});

const booking = (
  helperId: string,
  from: number,
  to: number,
  extra: Record<string, unknown> = {},
) => ({
  dayId: "d1",
  roleId: "kueche",
  helperId,
  name: helperId,
  startsAt: at(4, from),
  endsAt: at(4, to),
  slotIndex: null,
  ...extra,
});

describe("buildExportDays", () => {
  it("omits days without shifts", () => {
    const result = buildExportDays(
      [day("d1", 4), day("d2", 5)],
      [kitchen("d1", 10, 12)],
      [],
      [],
    );
    expect(result.map((d) => d.dayId)).toEqual(["d1"]);
  });

  it("uses the range without ±1h padding", () => {
    const [result] = buildExportDays(
      [day("d1", 4)],
      [kitchen("d1", 10, 12)],
      [],
      [],
    );
    expect(result.timeSlots).toHaveLength(4);
    expect(result.timeSlots[0]).toEqual(at(4, 10));
  });

  it("merges adjacent blocks of the same person into one", () => {
    const [result] = buildExportDays(
      [day("d1", 4)],
      [kitchen("d1", 10, 14)],
      [booking("anna", 10, 12), booking("anna", 12, 14)],
      [],
    );
    expect(result.blocks).toEqual([
      { column: 0, startRow: 0, rowSpan: 8, label: "anna" },
    ]);
  });

  it("does not merge different people and spreads them over columns", () => {
    const [result] = buildExportDays(
      [day("d1", 4)],
      [kitchen("d1", 10, 14, 2)],
      [booking("anna", 10, 14), booking("ben", 10, 12)],
      [],
    );
    expect(result.columnCount).toBe(2);
    expect(result.blocks.map((b) => [b.label, b.column])).toEqual([
      ["anna", 0],
      ["ben", 1],
    ]);
  });

  it("greys out places that are not planned", () => {
    const [result] = buildExportDays(
      [day("d1", 4)],
      [kitchen("d1", 10, 14), kitchen("d1", 12, 14)],
      [],
      [],
    );
    // 2 Stellen, die zweite nur 12–14 → Spalte 1 grau in den ersten 4 Zeilen
    expect(result.greyCells).toEqual([{ column: 1, startRow: 0, rowSpan: 4 }]);
  });

  it("builds lists for capacity 0 roles without a grid column", () => {
    const [result] = buildExportDays(
      [day("d1", 4)],
      [
        kitchen("d1", 10, 12),
        {
          dayId: "d1",
          roleId: "erklaerer",
          roleName: "Erklärer",
          capacity: 0,
          targetStartsAt: at(4, 10),
          targetEndsAt: at(4, 18),
        },
      ],
      [],
      [
        { dayId: "d1", roleId: "erklaerer", name: "Zoe" },
        { dayId: "d1", roleId: "erklaerer", name: "Max (Gast)" },
        { dayId: "d2", roleId: "erklaerer", name: "Andere" },
        { dayId: "d1", roleId: "kueche", name: "Nicht gelistet" },
      ],
    );
    expect(result.columns.map((c) => c.roleId)).toEqual(["kueche"]);
    expect(result.lists).toEqual([
      { roleName: "Erklärer", names: ["Max (Gast)", "Zoe"], count: 2 },
    ]);
  });
});

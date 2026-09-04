import { describe, expect, it } from "vitest";
import { getVisibleNavGroups } from "./nav-config";

const NO_FLAGS = { openHelperRequest: false, activeAusleiheShift: false };

describe("Nav-Sichtbarkeit 'Support & Spenden' (#420)", () => {
  it("shows 'Support & Spenden' to a guest — Sperre aus #96 aufgehoben (#267 löst sie)", () => {
    const groups = getVisibleNavGroups("gast", new Set(), false, NO_FLAGS);

    const labels = groups.flatMap((group) => group.items.map((i) => i.label));
    expect(labels).toContain("Support & Spenden");
  });
});

describe("Nav-Sichtbarkeit 'Ausleihe & Rückgabe' (#433)", () => {
  it("hides the entry without an active Leihe-Schicht", () => {
    const groups = getVisibleNavGroups("mitglied", new Set(), false, NO_FLAGS);

    const labels = groups.flatMap((group) => group.items.map((i) => i.label));
    expect(labels).not.toContain("Ausleihe & Rückgabe");
  });

  it("shows the entry with an active Leihe-Schicht", () => {
    const groups = getVisibleNavGroups("mitglied", new Set(), false, {
      ...NO_FLAGS,
      activeAusleiheShift: true,
    });

    const labels = groups.flatMap((group) => group.items.map((i) => i.label));
    expect(labels).toContain("Ausleihe & Rückgabe");
  });
});

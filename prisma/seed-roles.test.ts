import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/utils/prisma", () => ({ prisma: {} }));

const { AUSGETRETEN_PERMISSION_KEYS } = await import("./seed-roles");

/**
 * #537 (Vier-Augen-Prinzip): die Spiel-Detailseite zeigt Exemplar-Aktionen
 * nur mit `ludothek:view` (`render-game-detail.tsx`, sonst Gastansicht) —
 * die „Ausgetreten"-Rolle (#332) darf dieses Recht nie (wieder) bekommen,
 * ebenso wenig `ludothek:borrow` (Buchungs-Actions).
 */
describe("Ausgetreten-Rolle", () => {
  it("has neither ludothek:view nor ludothek:borrow", () => {
    expect(AUSGETRETEN_PERMISSION_KEYS).not.toContain("ludothek:view");
    expect(AUSGETRETEN_PERMISSION_KEYS).not.toContain("ludothek:borrow");
  });
});

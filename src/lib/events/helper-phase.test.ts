import { describe, expect, it } from "vitest";
import {
  HELPER_PHASE_LABELS,
  helperPhasesAtLeast,
  isHelperPhaseAtLeast,
} from "./helper-phase";

describe("isHelperPhaseAtLeast", () => {
  it("PLANNING is only at least PLANNING", () => {
    expect(isHelperPhaseAtLeast("PLANNING", "PLANNING")).toBe(true);
    expect(isHelperPhaseAtLeast("PLANNING", "SEEKING")).toBe(false);
    expect(isHelperPhaseAtLeast("PLANNING", "CONFIRMATION_REQUESTED")).toBe(
      false,
    );
  });

  it("SEEKING includes PLANNING and SEEKING but not CONFIRMATION_REQUESTED", () => {
    expect(isHelperPhaseAtLeast("SEEKING", "PLANNING")).toBe(true);
    expect(isHelperPhaseAtLeast("SEEKING", "SEEKING")).toBe(true);
    expect(isHelperPhaseAtLeast("SEEKING", "CONFIRMATION_REQUESTED")).toBe(
      false,
    );
  });

  it("CONFIRMATION_REQUESTED is cumulative — includes every phase", () => {
    expect(isHelperPhaseAtLeast("CONFIRMATION_REQUESTED", "PLANNING")).toBe(
      true,
    );
    expect(isHelperPhaseAtLeast("CONFIRMATION_REQUESTED", "SEEKING")).toBe(
      true,
    );
    expect(
      isHelperPhaseAtLeast("CONFIRMATION_REQUESTED", "CONFIRMATION_REQUESTED"),
    ).toBe(true);
  });
});

describe("helperPhasesAtLeast", () => {
  it("lists the phases from the minimum onwards", () => {
    expect(helperPhasesAtLeast("PLANNING")).toHaveLength(3);
    expect(helperPhasesAtLeast("SEEKING")).toEqual([
      "SEEKING",
      "CONFIRMATION_REQUESTED",
    ]);
    expect(helperPhasesAtLeast("CONFIRMATION_REQUESTED")).toEqual([
      "CONFIRMATION_REQUESTED",
    ]);
  });
});

describe("HELPER_PHASE_LABELS", () => {
  it("uses the German wording", () => {
    expect(HELPER_PHASE_LABELS).toEqual({
      PLANNING: "Planungsphase",
      SEEKING: "Helfer gesucht",
      CONFIRMATION_REQUESTED: "Bestätigung angefragt",
    });
  });
});

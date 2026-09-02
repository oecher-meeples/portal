import { describe, expect, it } from "vitest";
import { getSurveyDeadlineMessage } from "@/lib/content/survey";

const NOW = new Date("2026-08-10T12:00:00Z");

describe("getSurveyDeadlineMessage", () => {
  it("returns null without a deadline", () => {
    expect(getSurveyDeadlineMessage(undefined, NOW)).toBeNull();
  });

  it("pluralizes days remaining when more than one day is left", () => {
    expect(getSurveyDeadlineMessage("2026-08-13", NOW)).toBe(
      "Umfrage noch 3 Tage verfügbar",
    );
  });

  it("uses singular for exactly one day left", () => {
    expect(getSurveyDeadlineMessage("2026-08-11", NOW)).toBe(
      "Umfrage noch 1 Tag verfügbar",
    );
  });

  it("shows the 'ends today' message when the deadline is today", () => {
    expect(getSurveyDeadlineMessage("2026-08-10", NOW)).toBe(
      "Umfrage endet heute",
    );
  });

  it("shows the 'ended' message once the deadline has passed", () => {
    expect(getSurveyDeadlineMessage("2026-08-09", NOW)).toBe(
      "Umfrage beendet. Antworten werden unter Umständen nicht mehr berücksichtigt.",
    );
  });
});

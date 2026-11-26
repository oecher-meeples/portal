import { describe, expect, it } from "vitest";
import { isWithinAvailability } from "./booking-availability";

const at = (hour: number) => new Date(2026, 9, 10, hour, 0);

describe("isWithinAvailability", () => {
  it("is true when the block lies inside the reported availability", () => {
    expect(
      isWithinAvailability(
        { startsAt: at(10), endsAt: at(12) },
        { startsAt: at(9), endsAt: at(14) },
      ),
    ).toBe(true);
  });

  it("is true when the block matches the availability exactly", () => {
    expect(
      isWithinAvailability(
        { startsAt: at(10), endsAt: at(14) },
        { startsAt: at(10), endsAt: at(14) },
      ),
    ).toBe(true);
  });

  it("is false when the block only partly lies inside", () => {
    expect(
      isWithinAvailability(
        { startsAt: at(10), endsAt: at(14) },
        { startsAt: at(10), endsAt: at(12) },
      ),
    ).toBe(false);
    expect(
      isWithinAvailability(
        { startsAt: at(10), endsAt: at(14) },
        { startsAt: at(11), endsAt: at(18) },
      ),
    ).toBe(false);
  });

  it("is false without any reported availability", () => {
    expect(
      isWithinAvailability({ startsAt: at(10), endsAt: at(12) }, null),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  splitContributorsForDetail,
  type GameContributorDisplay,
} from "./game-contributors-display";

const illustrators = (count: number): GameContributorDisplay[] =>
  Array.from({ length: count }, (_, i) => ({
    name: `Illustrator ${i + 1}`,
    roles: ["ILLUSTRATOR"],
  }));

describe("splitContributorsForDetail", () => {
  it("keeps up to five illustrators inline", () => {
    const contributors = illustrators(5);

    expect(splitContributorsForDetail(contributors)).toEqual({
      inline: contributors,
      illustrators: [],
    });
  });

  it("moves more than five illustrators out, keeping publisher and multi-role people inline", () => {
    const publisher: GameContributorDisplay = {
      name: "Kosmos",
      roles: ["PUBLISHER"],
    };
    const both: GameContributorDisplay = {
      name: "Klaus Teuber",
      roles: ["AUTHOR", "ILLUSTRATOR"],
    };
    const only = illustrators(6);

    expect(splitContributorsForDetail([publisher, both, ...only])).toEqual({
      inline: [publisher, both],
      illustrators: only,
    });
  });
});

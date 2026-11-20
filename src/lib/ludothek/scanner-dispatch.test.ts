import { describe, expect, it } from "vitest";
import {
  decideReceive,
  decideTransfer,
  pickCopyForMode,
  type CopyCandidate,
} from "./scanner-dispatch";

const ME = "member-me";
const B = "member-b";

function copy(
  holding: {
    unitId?: string | null;
    vereinsmitgliedId?: string | null;
    origin?: "INITIAL" | "LOAN" | "RETURN" | "HANDOVER" | "RELOCATION";
    confirmedAt?: Date | null;
  } | null,
  status: "ACTIVE" | "DEINVENTARISED" = "ACTIVE",
) {
  return {
    id: "copy-1",
    status,
    holding: holding
      ? {
          unitId: holding.unitId ?? null,
          vereinsmitgliedId: holding.vereinsmitgliedId ?? null,
          origin: holding.origin ?? "LOAN",
          confirmedAt:
            holding.confirmedAt === undefined
              ? new Date()
              : holding.confirmedAt,
        }
      : null,
  } as Parameters<typeof decideReceive>[0];
}

describe("decideReceive (Modus Erhalten)", () => {
  it("borrows a game that lies in a unit", () => {
    expect(
      decideReceive(copy({ unitId: "unit-1", origin: "INITIAL" }), {
        memberId: ME,
      }),
    ).toBe("borrow");
  });

  it("takes a game over from another person, incl. the Sammelkonto", () => {
    expect(
      decideReceive(copy({ vereinsmitgliedId: B }), { memberId: ME }),
    ).toBe("handover");
  });

  it("takes over a RETURN that lies with me as a loan", () => {
    expect(
      decideReceive(
        copy({ vereinsmitgliedId: ME, origin: "RETURN", confirmedAt: null }),
        { memberId: ME },
      ),
    ).toBe("take-over-return");
  });

  it.each(["LOAN", "HANDOVER"] as const)(
    "confirms an unconfirmed %s on me",
    (origin) => {
      expect(
        decideReceive(
          copy({ vereinsmitgliedId: ME, origin, confirmedAt: null }),
          { memberId: ME },
        ),
      ).toBe("confirm");
    },
  );

  it("reports already-mine for a confirmed holding on me", () => {
    expect(
      decideReceive(copy({ vereinsmitgliedId: ME }), { memberId: ME }),
    ).toBe("already-mine");
  });

  it("rejects a deinventarised copy", () => {
    expect(() =>
      decideReceive(copy({ unitId: "unit-1" }, "DEINVENTARISED"), {
        memberId: ME,
      }),
    ).toThrow("deinventarisiert");
  });

  it("rejects a copy without open holding", () => {
    expect(() => decideReceive(copy(null), { memberId: ME })).toThrow(
      "keinen offenen Aufenthalt",
    );
  });
});

describe("decideTransfer (Modus Übergeben)", () => {
  const actor = { memberId: ME };

  describe("Ziel Einheit", () => {
    const target = { kind: "unit" as const, unitId: "unit-k1" };

    it("returns a game from a person into the unit", () => {
      expect(
        decideTransfer(copy({ vereinsmitgliedId: B }), target, actor),
      ).toBe("return-to-unit");
    });

    it("relocates a game from another unit", () => {
      expect(decideTransfer(copy({ unitId: "unit-k2" }), target, actor)).toBe(
        "relocate",
      );
    });

    it("reports already-there for the same unit", () => {
      expect(decideTransfer(copy({ unitId: "unit-k1" }), target, actor)).toBe(
        "already-there",
      );
    });
  });

  describe("Ziel Person", () => {
    const handover = {
      kind: "member" as const,
      memberId: B,
      intent: "handover" as const,
    };

    it("hands over with intent handover", () => {
      expect(
        decideTransfer(copy({ vereinsmitgliedId: ME }), handover, actor),
      ).toBe("handover");
    });

    it("returns to the person with intent return", () => {
      expect(
        decideTransfer(
          copy({ vereinsmitgliedId: ME }),
          { ...handover, intent: "return" },
          actor,
        ),
      ).toBe("return-to-person");
    });

    it("reports already-there when the target person holds it", () => {
      expect(
        decideTransfer(copy({ vereinsmitgliedId: B }), handover, actor),
      ).toBe("already-there");
    });

    it("rejects myself as target", () => {
      expect(() =>
        decideTransfer(
          copy({ vereinsmitgliedId: B }),
          { ...handover, memberId: ME },
          actor,
        ),
      ).toThrow("Ziel ungültig");
    });
  });

  describe("Ziel extern", () => {
    const target = { kind: "external" as const, externalName: "Max" };

    it("hands a game I hold to the Sammelkonto", () => {
      expect(
        decideTransfer(copy({ vereinsmitgliedId: ME }), target, actor),
      ).toBe("external");
    });

    it("rejects a game that lies in a unit", () => {
      expect(() =>
        decideTransfer(copy({ unitId: "unit-1" }), target, actor),
      ).toThrow("Weitergeben kann nur");
    });
  });

  it("rejects a deinventarised copy", () => {
    expect(() =>
      decideTransfer(
        copy({ vereinsmitgliedId: ME }, "DEINVENTARISED"),
        { kind: "unit", unitId: "unit-1" },
        actor,
      ),
    ).toThrow("deinventarisiert");
  });
});

describe("pickCopyForMode", () => {
  function candidate(
    id: string,
    holding: CopyCandidate["holding"],
    needsCompletenessCheck = false,
  ): CopyCandidate {
    return { id, holding, needsCompletenessCheck };
  }
  const inUnit = (id: string, unitId = "unit-1", marked = false) =>
    candidate(id, { unitId, vereinsmitgliedId: null }, marked);
  const withMember = (id: string, memberId: string, marked = false) =>
    candidate(id, { unitId: null, vereinsmitgliedId: memberId }, marked);

  it("returns the only copy regardless of mode", () => {
    const only = withMember("a", ME);
    expect(pickCopyForMode([only], "receive", { ownMemberId: ME })).toBe(only);
  });

  describe("receive", () => {
    it("picks the one copy not already with me", () => {
      expect(
        pickCopyForMode([withMember("a", ME), inUnit("b")], "receive", {
          ownMemberId: ME,
        })?.id,
      ).toBe("b");
    });

    it("returns null when several are not with me", () => {
      expect(
        pickCopyForMode([inUnit("a"), inUnit("b")], "receive", {
          ownMemberId: ME,
        }),
      ).toBeNull();
    });
  });

  describe("transfer", () => {
    it("picks the one copy not already at the target unit", () => {
      expect(
        pickCopyForMode(
          [inUnit("a", "unit-k1"), inUnit("b", "unit-k2")],
          "transfer",
          {
            ownMemberId: ME,
            target: { unitId: "unit-k1" },
          },
        )?.id,
      ).toBe("b");
    });

    it("prefers the copy with me among several candidates", () => {
      expect(
        pickCopyForMode(
          [inUnit("a", "unit-k2"), withMember("b", ME), withMember("c", B)],
          "transfer",
          { ownMemberId: ME, target: { unitId: "unit-k1" } },
        )?.id,
      ).toBe("b");
    });

    it("skips a copy already with the target person", () => {
      expect(
        pickCopyForMode([withMember("a", B), withMember("b", ME)], "transfer", {
          ownMemberId: ME,
          target: { memberId: B },
        })?.id,
      ).toBe("b");
    });

    it("returns null without a unique candidate", () => {
      expect(
        pickCopyForMode([inUnit("a"), inUnit("b")], "transfer", {
          ownMemberId: ME,
          target: null,
        }),
      ).toBeNull();
    });
  });

  describe("mark / check", () => {
    const copies = [inUnit("a", "unit-1", true), inUnit("b", "unit-1", false)];

    it("mark picks the unmarked copy", () => {
      expect(pickCopyForMode(copies, "mark", { ownMemberId: ME })?.id).toBe(
        "b",
      );
    });

    it("check picks the marked copy", () => {
      expect(pickCopyForMode(copies, "check", { ownMemberId: ME })?.id).toBe(
        "a",
      );
    });

    it("returns null when several are marked", () => {
      expect(
        pickCopyForMode(
          [inUnit("a", "unit-1", true), inUnit("b", "unit-1", true)],
          "check",
          { ownMemberId: ME },
        ),
      ).toBeNull();
    });
  });
});

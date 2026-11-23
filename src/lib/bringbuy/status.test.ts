import { describe, expect, it } from "vitest";
import {
  canTransitionFleaMarketItemStatus,
  isFleaMarketExternalSellerTokenValid,
} from "./status";

describe("canTransitionFleaMarketItemStatus", () => {
  it("allows PENDING -> FOR_SALE", () => {
    expect(canTransitionFleaMarketItemStatus("PENDING", "FOR_SALE")).toBe(true);
  });

  it("allows SOLD -> PAID_OUT", () => {
    expect(canTransitionFleaMarketItemStatus("SOLD", "PAID_OUT")).toBe(true);
  });

  it("allows FOR_SALE -> RETURNED and FOR_SALE -> DONATED", () => {
    expect(canTransitionFleaMarketItemStatus("FOR_SALE", "RETURNED")).toBe(
      true,
    );
    expect(canTransitionFleaMarketItemStatus("FOR_SALE", "DONATED")).toBe(true);
  });

  it("allows RESERVED -> RETURNED", () => {
    expect(canTransitionFleaMarketItemStatus("RESERVED", "RETURNED")).toBe(
      true,
    );
  });

  it("rejects terminal states transitioning further", () => {
    expect(canTransitionFleaMarketItemStatus("PAID_OUT", "SOLD")).toBe(false);
    expect(canTransitionFleaMarketItemStatus("RETURNED", "FOR_SALE")).toBe(
      false,
    );
    expect(canTransitionFleaMarketItemStatus("DONATED", "FOR_SALE")).toBe(
      false,
    );
  });

  it("rejects skipping straight from PENDING to SOLD", () => {
    expect(canTransitionFleaMarketItemStatus("PENDING", "SOLD")).toBe(false);
  });
});

describe("isFleaMarketExternalSellerTokenValid", () => {
  it("stays valid for a seller with no items yet", () => {
    expect(isFleaMarketExternalSellerTokenValid([])).toBe(true);
  });

  it("stays valid while at least one item still needs action", () => {
    expect(
      isFleaMarketExternalSellerTokenValid([
        { status: "PAID_OUT" },
        { status: "SOLD" },
      ]),
    ).toBe(true);
  });

  it("becomes invalid once every item reached a terminal state", () => {
    expect(
      isFleaMarketExternalSellerTokenValid([
        { status: "PAID_OUT" },
        { status: "RETURNED" },
        { status: "DONATED" },
      ]),
    ).toBe(false);
  });
});

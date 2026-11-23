import { describe, expect, it } from "vitest";
import { ProfilePictureVisibility } from "@prisma/client";
import {
  isProfilePictureVisible,
  resolveVisibleProfilePictureUrl,
} from "./profile-picture-visibility";

describe("isProfilePictureVisible (#389)", () => {
  it("INTERN is visible to any logged-in meeple, never to a guest", () => {
    expect(
      isProfilePictureVisible(ProfilePictureVisibility.INTERN, {
        kind: "meeple",
      }),
    ).toBe(true);
    expect(
      isProfilePictureVisible(ProfilePictureVisibility.INTERN, {
        kind: "guest",
        isAttendingExplainerNow: true,
      }),
    ).toBe(false);
  });

  it("EVENTS is visible to a guest only while actively attending as explainer now", () => {
    expect(
      isProfilePictureVisible(ProfilePictureVisibility.EVENTS, {
        kind: "guest",
        isAttendingExplainerNow: true,
      }),
    ).toBe(true);
    expect(
      isProfilePictureVisible(ProfilePictureVisibility.EVENTS, {
        kind: "guest",
        isAttendingExplainerNow: false,
      }),
    ).toBe(false);
  });

  it("IMMER is always visible, meeple or guest, attending or not", () => {
    expect(
      isProfilePictureVisible(ProfilePictureVisibility.IMMER, {
        kind: "guest",
        isAttendingExplainerNow: false,
      }),
    ).toBe(true);
    expect(
      isProfilePictureVisible(ProfilePictureVisibility.IMMER, {
        kind: "meeple",
      }),
    ).toBe(true);
  });
});

describe("resolveVisibleProfilePictureUrl (#389)", () => {
  it("is null without an uploaded picture, regardless of visibility", () => {
    expect(
      resolveVisibleProfilePictureUrl(
        {
          profilePictureUrl: null,
          profilePictureVisibility: ProfilePictureVisibility.IMMER,
        },
        { kind: "meeple" },
      ),
    ).toBeNull();
  });

  it("hides the url from a non-attending guest under EVENTS", () => {
    expect(
      resolveVisibleProfilePictureUrl(
        {
          profilePictureUrl: "https://blob.example/pic.jpg",
          profilePictureVisibility: ProfilePictureVisibility.EVENTS,
        },
        { kind: "guest", isAttendingExplainerNow: false },
      ),
    ).toBeNull();
  });

  it("returns the url to an attending guest under EVENTS", () => {
    expect(
      resolveVisibleProfilePictureUrl(
        {
          profilePictureUrl: "https://blob.example/pic.jpg",
          profilePictureVisibility: ProfilePictureVisibility.EVENTS,
        },
        { kind: "guest", isAttendingExplainerNow: true },
      ),
    ).toBe("https://blob.example/pic.jpg");
  });
});

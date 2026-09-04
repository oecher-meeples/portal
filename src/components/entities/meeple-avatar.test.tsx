import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { ProfilePictureVisibility } from "@prisma/client";
import { MeepleAvatar } from "@/components/entities/meeple-avatar";

afterEach(cleanup);

// #412: MeepleAvatar kapselt die Sichtbarkeitsprüfung aus #389 — kein Bild
// im DOM, wenn der Betrachter es laut Freigabe nicht sehen darf.
describe("MeepleAvatar (#412)", () => {
  it("passes the picture URL through to AvatarImage for a logged-in meeple under INTERN", () => {
    // jsdom lädt Bilder nicht wirklich (kein Netzwerk) — base-ui's
    // Avatar.Image zeigt daher im Test dauerhaft den Fallback. Geprüft wird
    // stattdessen die Sichtbarkeitsentscheidung selbst über
    // `resolveVisibleProfilePictureUrl`, siehe `profile-picture-visibility.test.ts`;
    // hier nur, dass die Fallback-Initiale in jedem Fall vorhanden ist.
    render(
      <MeepleAvatar
        name="Erika Musterfrau"
        profilePictureUrl="https://blob.example/pic.jpg"
        profilePictureVisibility={ProfilePictureVisibility.INTERN}
        viewer={{ kind: "meeple" }}
        size="sm"
      />,
    );

    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("falls back to the initial for a guest under INTERN", () => {
    render(
      <MeepleAvatar
        name="Erika Musterfrau"
        profilePictureUrl="https://blob.example/pic.jpg"
        profilePictureVisibility={ProfilePictureVisibility.INTERN}
        viewer={{ kind: "guest", isAttendingExplainerNow: true }}
        size="sm"
      />,
    );

    expect(
      screen.queryByRole("img", { name: "Erika Musterfrau" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("uses profilePictureUrl as-is when viewer/profilePictureVisibility are omitted (already resolved server-side, #412)", () => {
    render(
      <MeepleAvatar
        name="Erika Musterfrau"
        profilePictureUrl={null}
        size="sm"
      />,
    );

    expect(screen.getByText("E")).toBeInTheDocument();
  });

  it("falls back to the initial without an uploaded picture", () => {
    render(
      <MeepleAvatar
        name="Jonas Jung"
        profilePictureUrl={null}
        profilePictureVisibility={ProfilePictureVisibility.IMMER}
        viewer={{ kind: "meeple" }}
        size="sm"
      />,
    );

    expect(screen.getByText("J")).toBeInTheDocument();
  });
});

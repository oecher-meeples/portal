import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProfilePictureUpload } from "@/components/feature/mitglied-profil/profile-picture-upload";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const deleteMeepleProfilePictureMock = vi.fn();
const updateMeepleProfilePictureVisibilityMock = vi.fn();
vi.mock(
  "@/components/feature/mitglied-profil/meeple-profile-picture-actions",
  () => ({
    getMeepleProfilePictureUploadToken: vi.fn(),
    saveMeepleProfilePicture: vi.fn(),
    updateMeepleProfilePictureVisibility: (...args: unknown[]) =>
      updateMeepleProfilePictureVisibilityMock(...args),
    deleteMeepleProfilePicture: (...args: unknown[]) =>
      deleteMeepleProfilePictureMock(...args),
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProfilePictureUpload (#389)", () => {
  it("renders nothing for a non-editing viewer without an uploaded picture", () => {
    const { container } = render(
      <ProfilePictureUpload
        meepleId="meeple-1"
        profilePictureUrl={null}
        visibility="INTERN"
        canEdit={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the picture read-only for a non-editing viewer", () => {
    const { container } = render(
      <ProfilePictureUpload
        meepleId="meeple-1"
        profilePictureUrl="https://blob.example/pic.jpg"
        visibility="INTERN"
        canEdit={false}
      />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://blob.example/pic.jpg",
    );
    expect(
      screen.queryByRole("button", { name: /entfernen/i }),
    ).not.toBeInTheDocument();
  });

  it("lets an editor remove the current picture", () => {
    deleteMeepleProfilePictureMock.mockResolvedValue({ success: true });

    render(
      <ProfilePictureUpload
        meepleId="meeple-1"
        profilePictureUrl="https://blob.example/pic.jpg"
        visibility="INTERN"
        canEdit
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /entfernen/i }));

    expect(deleteMeepleProfilePictureMock).toHaveBeenCalledWith("meeple-1");
  });

  it("lets an editor change the visibility even without a picture yet", () => {
    render(
      <ProfilePictureUpload
        meepleId="meeple-1"
        profilePictureUrl={null}
        visibility="INTERN"
        canEdit
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "IMMER" },
    });

    // No picture yet — nothing to persist, but no crash either.
    expect(updateMeepleProfilePictureVisibilityMock).not.toHaveBeenCalled();
  });
});

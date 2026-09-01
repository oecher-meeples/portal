import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MeepleDatenSection } from "@/components/feature/mitglied-profil/meeple-daten-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const updateMeepleDatenMock = vi.fn();
const updateMeepleDatenVisibilityMock = vi.fn();
vi.mock("@/components/feature/mitglied-profil/meeple-daten-actions", () => ({
  updateMeepleDaten: (...args: unknown[]) => updateMeepleDatenMock(...args),
  updateMeepleDatenVisibility: (...args: unknown[]) =>
    updateMeepleDatenVisibilityMock(...args),
}));

vi.mock(
  "@/components/feature/mitglied-profil/meeple-profile-picture-actions",
  () => ({
    getMeepleProfilePictureUploadToken: vi.fn(),
    saveMeepleProfilePicture: vi.fn(),
    updateMeepleProfilePictureVisibility: vi.fn(),
    deleteMeepleProfilePicture: vi.fn(),
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const MEEPLE = {
  id: "meeple-1",
  bggUsername: "erika",
  bgaUsername: null,
  telegramHandle: null,
  signalHandle: null,
  discordHandle: null,
  address: "Musterstraße 1",
  shareAddress: false,
  doorbellNote: null,
  profilePictureUrl: null,
  profilePictureVisibility: "INTERN" as const,
  meepleDatenVisibility: "INTERN" as const,
};

describe("MeepleDatenSection (#382)", () => {
  it("shows the notice text and hides the address when shareAddress is off", () => {
    render(
      <MeepleDatenSection
        meeple={MEEPLE}
        canEdit={false}
        showAddress={false}
      />,
    );

    expect(
      screen.getByText("Freiwillige Angaben für andere Meeple."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Musterstraße 1")).not.toBeInTheDocument();
  });

  it("shows the address to the meeple themselves", () => {
    render(<MeepleDatenSection meeple={MEEPLE} canEdit showAddress />);

    expect(screen.getByText("Musterstraße 1")).toBeInTheDocument();
  });

  it("saves directly on edit, no pending change", async () => {
    updateMeepleDatenMock.mockResolvedValue({ success: true });

    render(<MeepleDatenSection meeple={MEEPLE} canEdit showAddress />);

    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.change(screen.getByLabelText("BoardGameGeek-Username"), {
      target: { value: "neu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await screen.findByRole("button", { name: /bearbeiten/i });
    expect(updateMeepleDatenMock).toHaveBeenCalledWith(
      "meeple-1",
      expect.objectContaining({ bggUsername: "neu" }),
    );
  });

  it("saves the visibility dropdown immediately (Live-Review F2)", async () => {
    updateMeepleDatenVisibilityMock.mockResolvedValue({ success: true });

    render(<MeepleDatenSection meeple={MEEPLE} canEdit showAddress />);

    fireEvent.change(
      screen.getByLabelText("Sichtbarkeit der freiwilligen Angaben"),
      { target: { value: "IMMER" } },
    );

    expect(updateMeepleDatenVisibilityMock).toHaveBeenCalledWith(
      "meeple-1",
      "IMMER",
    );
  });
});

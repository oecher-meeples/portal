import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StammdatenSection } from "@/components/feature/mitglied-profil/stammdaten-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const updateMemberStammdatenMock = vi.fn();
const requestMemberStammdatenChangeMock = vi.fn();
vi.mock("@/components/feature/mitglied-profil/stammdaten-actions", () => ({
  updateMemberStammdaten: (...args: unknown[]) =>
    updateMemberStammdatenMock(...args),
  requestMemberStammdatenChange: (...args: unknown[]) =>
    requestMemberStammdatenChangeMock(...args),
}));

vi.mock("@/lib/members/pending-change-actions", () => ({
  approvePendingChange: vi.fn(),
  rejectPendingChange: vi.fn(),
  checkOpenInviteBeforeApproval: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const MEMBER = {
  id: "member-1",
  firstName: "Erika",
  lastName: "Muster",
  birthDate: null,
  birthPlace: null,
  street: null,
  postalCode: null,
  city: null,
  phone: null,
  tshirtSizeId: null,
  joinedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("StammdatenSection (#380)", () => {
  it("shows a plain readonly view without any edit affordance for a viewer with only page access", () => {
    render(
      <StammdatenSection
        member={MEMBER}
        canManage={false}
        canRequestChange={false}
        isAdmin={false}
        openChanges={[]}
      />,
    );

    expect(screen.getByText("Erika")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /bearbeiten/i }),
    ).not.toBeInTheDocument();
  });

  it("members:manage saves directly, no pending change", async () => {
    updateMemberStammdatenMock.mockResolvedValue({ success: true });

    render(
      <StammdatenSection
        member={MEMBER}
        canManage
        canRequestChange={false}
        isAdmin={false}
        openChanges={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.change(screen.getByLabelText("Vorname"), {
      target: { value: "Neu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await screen.findByRole("button", { name: /bearbeiten/i });
    expect(updateMemberStammdatenMock).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({ firstName: "Neu" }),
    );
    expect(requestMemberStammdatenChangeMock).not.toHaveBeenCalled();
  });

  it("self/guardian submits a change request instead of saving directly", async () => {
    requestMemberStammdatenChangeMock.mockResolvedValue({ success: true });

    render(
      <StammdatenSection
        member={MEMBER}
        canManage={false}
        canRequestChange
        isAdmin={false}
        openChanges={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.change(screen.getByLabelText("Vorname"), {
      target: { value: "Neu" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /änderung beantragen/i }),
    );

    await screen.findByRole("button", { name: /bearbeiten/i });
    expect(requestMemberStammdatenChangeMock).toHaveBeenCalledWith("member-1", {
      firstName: { old: "Erika", new: "Neu" },
    });
    expect(updateMemberStammdatenMock).not.toHaveBeenCalled();
  });

  it("shows open pending changes only for admin:access", () => {
    render(
      <StammdatenSection
        member={MEMBER}
        canManage={false}
        canRequestChange
        isAdmin
        openChanges={[
          {
            id: "pc-1",
            memberDisplayName: "Erika Muster",
            memberNumber: 1,
            displayValue: "Vorname: Neu",
            requestedAt: new Date("2026-08-01").toISOString(),
            confirmed: true,
          },
        ]}
      />,
    );

    expect(screen.getByText(/Offene Änderungsanträge/)).toBeInTheDocument();
    expect(screen.getByText(/Vorname: Neu/)).toBeInTheDocument();
  });

  it("edits the tshirt size via a dropdown and shows its label read-only (#388)", async () => {
    updateMemberStammdatenMock.mockResolvedValue({ success: true });

    render(
      <StammdatenSection
        member={{ ...MEMBER, tshirtSizeId: "size-s" }}
        canManage
        canRequestChange={false}
        isAdmin={false}
        openChanges={[]}
        tshirtSizeOptions={[
          { id: "size-s", label: "S" },
          { id: "size-m", label: "M" },
        ]}
      />,
    );

    expect(screen.getByText("S")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.change(screen.getByLabelText("T-Shirt-Größe"), {
      target: { value: "size-m" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await screen.findByRole("button", { name: /bearbeiten/i });
    expect(updateMemberStammdatenMock).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({ tshirtSizeId: "size-m" }),
    );
  });
});

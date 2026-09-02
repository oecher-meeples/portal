import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BankverbindungSection } from "@/components/feature/mitglied-profil/bankverbindung-section";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const revealMemberIbanMock = vi.fn();
const revealPendingMemberIbanMock = vi.fn();
const updateMemberIbanMock = vi.fn();
vi.mock("@/components/feature/mitglied-profil/bankverbindung-actions", () => ({
  revealMemberIban: (...args: unknown[]) => revealMemberIbanMock(...args),
  revealPendingMemberIban: (...args: unknown[]) =>
    revealPendingMemberIbanMock(...args),
  updateMemberIban: (...args: unknown[]) => updateMemberIbanMock(...args),
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

describe("BankverbindungSection (#381)", () => {
  it("shows the masked IBAN without reveal/edit affordance for a non-Kassenwart viewer (self)", () => {
    render(
      <BankverbindungSection
        memberId="member-1"
        meepleId="meeple-1"
        accountHolder="Erika Muster"
        maskedIban="•••• 1234"
        hasIban
        canEdit={false}
        openChanges={[]}
      />,
    );

    expect(screen.getByText("•••• 1234")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /bearbeiten/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /kopieren/i }),
    ).not.toBeInTheDocument();
  });

  it("gives the Kassenwart reveal, copy and edit affordances", () => {
    render(
      <BankverbindungSection
        memberId="member-1"
        meepleId="meeple-1"
        accountHolder="Erika Muster"
        maskedIban="•••• 1234"
        hasIban
        canEdit
        openChanges={[]}
      />,
    );

    expect(
      screen.getByRole("button", { name: /bearbeiten/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /kopieren/i }),
    ).toBeInTheDocument();
  });

  it("Kassenwart saves a direct edit via updateMemberIban", async () => {
    updateMemberIbanMock.mockResolvedValue({ success: true });

    render(
      <BankverbindungSection
        memberId="member-1"
        meepleId="meeple-1"
        accountHolder="Erika Muster"
        maskedIban="•••• 1234"
        hasIban
        canEdit
        openChanges={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /bearbeiten/i }));
    fireEvent.change(screen.getByLabelText("IBAN"), {
      target: { value: "DE89370400440532013000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Speichern" }));

    await screen.findByRole("button", { name: /bearbeiten/i });
    expect(updateMemberIbanMock).toHaveBeenCalledWith(
      "member-1",
      expect.objectContaining({ iban: "DE89370400440532013000" }),
    );
  });
});

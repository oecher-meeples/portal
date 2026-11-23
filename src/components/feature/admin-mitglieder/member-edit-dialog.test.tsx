import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemberEditDialog } from "@/components/feature/admin-mitglieder/member-edit-dialog";
import type { VereinsmitgliedRow } from "@/components/feature/admin-mitglieder/vereinsmitglied-row";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/feature/admin-mitglieder/member-actions", () => ({
  updateMember: vi.fn(),
  sendSelbstauskunft: vi.fn(),
  listGuardianManagement: vi
    .fn()
    .mockResolvedValue({ guardians: [], candidates: [] }),
  addGuardian: vi.fn(),
  removeGuardian: vi.fn(),
  listWardManagement: vi.fn().mockResolvedValue({ wards: [], candidates: [] }),
  addWard: vi.fn(),
  removeWard: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const MEMBER: VereinsmitgliedRow = {
  id: "member-1",
  memberNumber: 1,
  slug: "erika-musterfrau",
  displayName: "Erika Musterfrau",
  email: "erika@example.com",
  firstName: "Erika",
  lastName: "Musterfrau",
  birthDate: null,
  birthPlace: null,
  street: null,
  postalCode: null,
  city: null,
  phone: null,
  meepleId: null,
  hasPortalLogin: false,
  joinedAt: "2024-01-01T00:00:00.000Z",
  resignedAt: null,
  membershipEndsAt: null,
  membershipState: "registriert",
  contributionCategory: null,
  openGames: 0,
  openUnits: 0,
  stufe3Eligible: false,
  openInviteToken: null,
};

describe("MemberEditDialog — profile page link (#387)", () => {
  it("links to the full profile page under /profil/{slug}", async () => {
    const user = userEvent.setup();
    render(<MemberEditDialog member={MEMBER} isAdmin={false} />);

    await user.click(
      screen.getByRole("button", {
        name: `Vereinsmitglied „${MEMBER.displayName}“ bearbeiten`,
      }),
    );

    const link = await screen.findByRole("link", {
      name: /volle profilseite/i,
    });
    expect(link).toHaveAttribute("href", "/profil/erika-musterfrau");
  });
});

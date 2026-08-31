import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VereinsmitgliederTable } from "@/components/feature/admin-mitglieder/vereinsmitglieder-table";
import type { VereinsmitgliedRow } from "@/components/feature/admin-mitglieder/vereinsmitglied-row";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/components/feature/admin-mitglieder/resign-membership-dialog", () => ({
  ResignMembershipDialog: () => null,
}));
vi.mock("@/components/feature/admin-mitglieder/anonymise-meeple-dialog", () => ({
  AnonymiseMeepleDialog: () => null,
}));
vi.mock("@/components/feature/admin-mitglieder/delete-member-dialog", () => ({
  DeleteMemberDialog: () => null,
}));
vi.mock("@/components/feature/admin-mitglieder/create-member-dialog", () => ({
  CreateMemberDialog: () => null,
}));
vi.mock("@/components/feature/admin-mitglieder/member-edit-dialog", () => ({
  MemberEditDialog: () => null,
}));
vi.mock("@/components/feature/admin-mitglieder/actions", () => ({
  revokeResignation: vi.fn(),
}));
vi.mock("@/components/feature/admin-mitglieder/invite-actions", () => ({
  createInvite: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

function member(overrides: Partial<VereinsmitgliedRow> = {}): VereinsmitgliedRow {
  return {
    id: "member-1",
    memberNumber: 1,
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
    meepleId: "meeple-1",
    hasPortalLogin: true,
    joinedAt: null,
    resignedAt: null,
    membershipEndsAt: null,
    membershipState: "registriert",
    contributionCategory: "mini",
    openGames: 0,
    openUnits: 0,
    stufe3Eligible: false,
    ...overrides,
  };
}

const MINI_MEMBER = member({ id: "member-mini", contributionCategory: "mini" });
const JUNG_MEMBER = member({
  id: "member-jung",
  displayName: "Jonas Jung",
  contributionCategory: "jung",
});

describe("VereinsmitgliederTable contribution filter (#340)", () => {
  it("shows every member without a filter", () => {
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, JUNG_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
      />,
    );

    expect(screen.getByText("Erika Musterfrau")).toBeInTheDocument();
    expect(screen.getByText("Jonas Jung")).toBeInTheDocument();
  });

  it("shows only members matching the given contribution filter", () => {
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, JUNG_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
        contributionFilter={["mini"]}
      />,
    );

    expect(screen.getByText("Erika Musterfrau")).toBeInTheDocument();
    expect(screen.queryByText("Jonas Jung")).not.toBeInTheDocument();
  });

  it("calls onClearContributionFilter when the filter chip's × is clicked", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, JUNG_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
        contributionFilter={["mini"]}
        onClearContributionFilter={onClear}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Beitragsart-Filter entfernen" }),
    );

    expect(onClear).toHaveBeenCalled();
  });

  it("combines the contribution filter with the text search", async () => {
    const user = userEvent.setup();
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, JUNG_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
        contributionFilter={["mini", "jung"]}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Vereinsmitglied suchen …"),
      "Jonas",
    );

    expect(screen.queryByText("Erika Musterfrau")).not.toBeInTheDocument();
    expect(screen.getByText("Jonas Jung")).toBeInTheDocument();
  });
});

describe("VereinsmitgliederTable Zustand/Portal-Login filters (#344)", () => {
  const ANONYMISIERT_MEMBER = member({
    id: "member-anon",
    displayName: "Anonymer Meeple",
    membershipState: "anonymisiert",
    hasPortalLogin: false,
  });

  it("filters by Zustand", async () => {
    const user = userEvent.setup();
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, ANONYMISIERT_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nach Zustand filtern" }),
      "anonymisiert",
    );

    expect(screen.queryByText("Erika Musterfrau")).not.toBeInTheDocument();
    expect(screen.getByText("Anonymer Meeple")).toBeInTheDocument();
  });

  it("filters by Portal-Login vorhanden/fehlt", async () => {
    const user = userEvent.setup();
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, ANONYMISIERT_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nach Portal-Login filtern" }),
      "fehlt",
    );

    expect(screen.queryByText("Erika Musterfrau")).not.toBeInTheDocument();
    expect(screen.getByText("Anonymer Meeple")).toBeInTheDocument();
  });

  it("combines Zustand and Portal-Login filters", async () => {
    const user = userEvent.setup();
    render(
      <VereinsmitgliederTable
        members={[MINI_MEMBER, ANONYMISIERT_MEMBER]}
        defaultInviteDays={30}
        canManageMembers={false}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nach Zustand filtern" }),
      "registriert",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Nach Portal-Login filtern" }),
      "fehlt",
    );

    expect(screen.queryByText("Erika Musterfrau")).not.toBeInTheDocument();
    expect(screen.queryByText("Anonymer Meeple")).not.toBeInTheDocument();
    expect(
      screen.getByText("Keine Vereinsmitglieder gefunden."),
    ).toBeInTheDocument();
  });
});
